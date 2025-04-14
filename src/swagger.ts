import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import { Express } from "express";
import swaggerUi from "swagger-ui-express";

import { RouteDefinition } from "./types";
import { SwaggerOptions } from "./swagger-options";

export class ZodSwaggerGenerator {
  private routes: RouteDefinition[] = [];
  private options: SwaggerOptions;
  private spec: any;

  constructor(options?: SwaggerOptions | string) {
    let resolvedOptions: SwaggerOptions = {
      title: "API",
      description: "API documentation",
      version: "1.0.0",
    };

    if (typeof options === "string") {
      const filePath = path.resolve(options);

      if (filePath.endsWith(".json")) {
        const fileContents = fs.readFileSync(filePath, "utf-8");
        const jsonOptions = JSON.parse(fileContents) as SwaggerOptions;
        resolvedOptions = { ...resolvedOptions, ...jsonOptions };
      } else if (filePath.endsWith(".ts") || filePath.endsWith(".js")) {
        // Suporte a arquivo TS/JS (exige que o dev use transpiler ou runtime com suporte ESM)
        const importedOptions = require(filePath) as SwaggerOptions;
        resolvedOptions = { ...resolvedOptions, ...importedOptions };
      }
    } else if (typeof options === "object") {
      resolvedOptions = { ...resolvedOptions, ...options };
    }

    this.options = resolvedOptions;
  }

  addRoute(route: RouteDefinition) {
    this.routes.push(route);
    return this;
  }

  private zodToSwaggerSchema(schema: z.ZodTypeAny): any {
    // Type guards para melhor segurança de tipos
    const isZodOptional = (s: z.ZodTypeAny): s is z.ZodOptional<z.ZodTypeAny> =>
      s instanceof z.ZodOptional;

    const isZodNullable = (s: z.ZodTypeAny): s is z.ZodNullable<z.ZodTypeAny> =>
      s instanceof z.ZodNullable;

    const isZodDefault = (
      s: z.ZodTypeAny
    ): s is z.ZodTypeAny & { unwrap: () => z.ZodTypeAny } =>
      (s as any)._def?.typeName === "ZodDefault";

    // Função para desempacotar schemas com wrappers
    const unwrapSchema = (s: z.ZodTypeAny): z.ZodTypeAny => {
      if (isZodOptional(s) || isZodNullable(s) || isZodDefault(s)) {
        return s.unwrap();
      }
      return s;
    };

    // Remove todos os wrappers recursivamente
    let currentSchema = schema;
    let previousSchema: z.ZodTypeAny | null = null;

    while (previousSchema !== currentSchema) {
      previousSchema = currentSchema;
      currentSchema = unwrapSchema(currentSchema);
    }
    schema = currentSchema;

    // Extrai metadados de forma segura
    const getMetadata = (s: z.ZodTypeAny) => {
      const def = s._def;
      return {
        description: def.description as string | undefined,
        example: (def.example || (def as any).examples?.[0]) as any,
      };
    };

    // Handler para tipos específicos
    const handlers: Record<string, (s: z.ZodTypeAny) => any> = {
      ZodString: (s) => {
        const { description, example } = getMetadata(s);
        const checks = (s as z.ZodString)._def.checks || [];
        return {
          type: "string",
          ...(description && { description }),
          ...(example && { example }),
          ...(checks.some((c: any) => c.kind === "uuid") && { format: "uuid" }),
          ...(checks.some((c: any) => c.kind === "email") && {
            format: "email",
          }),
        };
      },
      ZodNumber: (s) => {
        const { description, example } = getMetadata(s);
        return {
          type: "number",
          ...(description && { description }),
          ...(example && { example }),
        };
      },
      ZodBoolean: (s) => {
        const { description, example } = getMetadata(s);
        return {
          type: "boolean",
          ...(description && { description }),
          ...(example && { example }),
        };
      },
      ZodObject: (s) => {
        const { description } = getMetadata(s);
        const shape = (s as z.ZodObject<any>).shape;
        const properties: Record<string, any> = {};
        const required: string[] = [];

        Object.entries(shape).forEach(([key, field]) => {
          properties[key] = this.zodToSwaggerSchema(field as any);
          if (!(field instanceof z.ZodOptional)) {
            required.push(key);
          }
        });

        return {
          type: "object",
          ...(description && { description }),
          properties,
          ...(required.length > 0 && { required }),
        };
      },
      ZodArray: (s) => {
        const { description, example } = getMetadata(s);
        return {
          type: "array",
          ...(description && { description }),
          ...(example && { example }),
          items: this.zodToSwaggerSchema((s as z.ZodArray<any>).element),
        };
      },
      ZodEnum: (s) => {
        const { description } = getMetadata(s);
        return {
          type: "string",
          ...(description && { description }),
          enum: (s as z.ZodEnum<any>).options,
        };
      },
      ZodLiteral: (s) => ({
        type: typeof (s as z.ZodLiteral<any>).value,
        enum: [(s as z.ZodLiteral<any>).value],
      }),
      ZodDate: () => ({
        type: "string",
        format: "date-time",
      }),
    };

    // Tenta encontrar um handler específico
    const typeName = schema._def.typeName;
    if (typeName && handlers[typeName]) {
      return handlers[typeName](schema);
    }

    // Fallback para tipos não tratados
    return {
      type: "object",
      description: `Unhandled Zod type: ${typeName}`,
    };
  }

  generateSpec(): any {
    this.spec = {
      openapi: "3.0.0",
      info: {
        title: this.options.title,
        version: this.options.version,
        description: this.options.description,
        contact: this.options.contact,
      },
      servers: [{ url: this.options.basePath }],
      paths: {},
      components: {
        schemas: {
          ErrorResponse: {
            type: "object",
            properties: {
              message: { type: "string" },
              code: { type: "string" },
            },
          },
          UserResponse: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              name: { type: "string" },
            },
          },
          ...(this.options.components?.schemas || {}),
        },
        ...this.options.components,
      },
    };

    this.routes.forEach((route) => {
      // Registra o schema do requestBody se existir
      if (route.schema) {
        const schemaName = this.getSchemaName(route.schema);
        if (schemaName && !this.spec.components.schemas[schemaName]) {
          this.spec.components.schemas[schemaName] = this.zodToSwaggerSchema(
            route.schema
          );
        }
      }

      // Registra os schemas das respostas
      if (route.responses) {
        Object.values(route.responses).forEach((response) => {
          if (response.schema) {
            const responseSchemaName = this.getSchemaName(response.schema);
            if (
              responseSchemaName &&
              !this.spec.components.schemas[responseSchemaName]
            ) {
              this.spec.components.schemas[responseSchemaName] =
                this.zodToSwaggerSchema(response.schema);
            }
          }
        });
      }
    });

    // Processa todas as rotas
    this.routes.forEach((route) => {
      const methodSpec: any = {
        tags: route.tags,
        summary: route.summary,
        description: route.description,
        parameters: this.buildParameters(route),
        responses: this.buildResponses(route), // Já adiciona os schemas necessários
      };

      if (["post", "put", "patch"].includes(route.method)) {
        methodSpec.requestBody = this.buildRequestBody(route);
      }

      if (!this.spec.paths[route.path]) {
        this.spec.paths[route.path] = {};
      }

      this.spec.paths[route.path][route.method] = methodSpec;
    });

    return this.spec;
  }

  private getSchemaName(schema: z.ZodTypeAny): string | undefined {
    if (schema._def?.description) {
      return schema._def.description
        .replace(/\b\w/g, (c: string) => c.toUpperCase()) // PascalCase
        .replace(/[^a-zA-Z0-9]/g, ""); // Remove caracteres especiais
    }
    return undefined;
  }

  setupExpress(app: Express, path = "/api-docs"): void {
    const spec = this.generateSpec();
    app.use(path, swaggerUi.serve, swaggerUi.setup(spec));
  }

  private buildParameters(route: RouteDefinition): any[] {
    const parameters: any[] = [];

    if (route.method === "get" && route.schema instanceof z.ZodObject) {
      for (const [key, field] of Object.entries(route.schema.shape)) {
        const zodField = field as z.ZodTypeAny;
        const isOptional = zodField.isOptional();

        parameters.push({
          name: key,
          in: "query",
          required: !isOptional,
          schema: this.zodToSwaggerSchema(zodField),
          description: zodField._def.description,
        });
      }
    }

    return parameters;
  }

  private buildRequestBody(route: RouteDefinition): any {
    if (!route.schema) return undefined;

    const schemaName = this.getSchemaName(route.schema);
    return {
      required: true,
      content: {
        "application/json": {
          schema: schemaName
            ? { $ref: `#/components/schemas/${schemaName}` }
            : this.zodToSwaggerSchema(route.schema),
        },
      },
    };
  }

  private buildResponses(route: RouteDefinition): any {
    const responses: any = {};

    // Primeiro processa todos os schemas de resposta
    for (const [statusCode, response] of Object.entries(
      route.responses || {}
    )) {
      if (response.schema) {
        const schemaName = this.getSchemaName(response.schema);
        if (schemaName) {
          // Adiciona ao spec.components.schemas se não existir
          if (!this.spec.components.schemas[schemaName]) {
            this.spec.components.schemas[schemaName] = this.zodToSwaggerSchema(
              response.schema
            );
          }
        }
      }
    }

    // Depois constrói as respostas
    for (const [statusCode, response] of Object.entries(
      route.responses || {}
    )) {
      const responseDef: any = {
        description: response.description,
      };

      if (response.schema) {
        const schemaName = this.getSchemaName(response.schema);
        responseDef.content = {
          "application/json": {
            schema: schemaName
              ? { $ref: `#/components/schemas/${schemaName}` }
              : this.zodToSwaggerSchema(response.schema),
          },
        };
      }

      responses[statusCode] = responseDef;
    }

    return responses;
  }
  private generateExample(schema: z.ZodTypeAny): any {
    const getExample = (s: z.ZodTypeAny) =>
      s._def.metadata?.example || (s._def as any).examples?.[0];

    if (schema instanceof z.ZodString) {
      return getExample(schema) || "example-string";
    }
    if (schema instanceof z.ZodNumber) {
      return getExample(schema) || 123;
    }
    if (schema instanceof z.ZodBoolean) {
      return true;
    }
    if (schema instanceof z.ZodObject) {
      return this.generateObjectExample(schema);
    }
    if (schema instanceof z.ZodArray) {
      return [this.generateExample(schema.element)];
    }
    return {};
  }

  private generateObjectExample(schema: z.ZodObject<any>): any {
    const example: any = {};
    for (const key in schema.shape) {
      example[key] = this.generateExample(schema.shape[key]);
    }
    return example;
  }

  private getSchemaMetadata(schema: z.ZodTypeAny): {
    description?: string;
    example?: any;
  } {
    return {
      description: schema._def.description,
      example:
        schema._def.metadata?.example ||
        (schema._def as any).examples?.[0] ||
        this.generateExample(schema),
    };
  }
}
