import * as fs from "fs";
import * as path from "path";
import * as swaggerUi from "swagger-ui-express";
import { z } from "zod";
import { Express } from "express";
import { load } from "js-yaml";

import {
  OpenAPI3Endpoint,
  RouteDefinition,
  Swagger2Endpoint,
  ZodSchemaToSwaggerOptions,
} from "../types";
import { deepMergeSwagger } from "../utils/fileManipulation/deepMergeSwagger";
import { loadYamlSpecs } from "../utils/fileManipulation/loadYamlSpecs";

/**
 * Class responsible for generating Swagger documentation based on Zod schemas.
 */
export class ZodSwaggerGenerator {
  private routes: RouteDefinition[] = [];
  private options: ZodSchemaToSwaggerOptions;
  private spec: any;

  /**
   * Creates an instance of the Swagger generator.
   * @param options - Settings for Swagger, which can be a path to a file or an options object.
   */
  constructor(options: ZodSchemaToSwaggerOptions) {
    let resolvedOptions: ZodSchemaToSwaggerOptions = {
      title: "API",
      version: "1.0.0",
      description: "Api Docs",
    };

    if (typeof options === "string") {
      const filePath = path.resolve(options);

      if (filePath.endsWith(".json")) {
        const fileContents = fs.readFileSync(filePath, "utf-8");
        const jsonOptions = JSON.parse(
          fileContents
        ) as ZodSchemaToSwaggerOptions;
        resolvedOptions = { ...resolvedOptions, ...jsonOptions };
      } else if (filePath.endsWith(".yml") || filePath.endsWith(".yaml")) {
        const yamlOptions = load(
          fs.readFileSync(filePath, "utf-8")
        ) as ZodSchemaToSwaggerOptions;
        resolvedOptions = { ...resolvedOptions, ...yamlOptions };
      }
    } else {
      resolvedOptions = { ...resolvedOptions, ...options };
    }

    if (options.mergeSpecs) {
      options.mergeSpecs.forEach((spec) => {
        if (spec.type === "json" || spec.type === "yaml") {
          if (!("path" in spec)) {
            throw new Error(`Missing 'path' for ${spec} spec`);
          }
        } else if (spec.type === "preloaded") {
          if (!("content" in spec)) {
            throw new Error(`Missing 'content' for preloaded spec`);
          }
        }
      });
    }

    this.options = {
      ...resolvedOptions,
      externalDocs: resolvedOptions.externalDocs
        ? {
            url: resolvedOptions.externalDocs.url,
            description: resolvedOptions.externalDocs.description,
          }
        : undefined,
    };
  }

  /**
   * Adds a new route to be documented.
   * @param route - Route definition with schema and metadata.
   * @returns The current instance to thread.
   */
  addRoute(route: RouteDefinition) {
    this.routes.push(route);
    return this;
  }

  /**
   * Converts a Zod schema to Swagger/OpenAPI schema format.
   * @param schema - Schema Zod to be converted.
   * @returns The equivalent schema in Swagger format.
   */
  private zodToSwaggerSchema(schema: z.ZodTypeAny): any {
    // Type guards for better type safety
    const isZodOptional = (s: z.ZodTypeAny): s is z.ZodOptional<z.ZodTypeAny> =>
      s instanceof z.ZodOptional;

    const isZodNullable = (s: z.ZodTypeAny): s is z.ZodNullable<z.ZodTypeAny> =>
      s instanceof z.ZodNullable;

    const isZodDefault = (
      s: z.ZodTypeAny
    ): s is z.ZodTypeAny & { unwrap: () => z.ZodTypeAny } =>
      (s as any)._def?.typeName === "ZodDefault";

    // Function to unpack schemas with wrappers
    const unwrapSchema = (s: z.ZodTypeAny): z.ZodTypeAny => {
      if (isZodOptional(s) || isZodNullable(s) || isZodDefault(s)) {
        return s.unwrap();
      }
      return s;
    };

    const { description, example, format } = this.getSchemaMetadata(schema);

    const baseSchema = {
      ...(description && { description }),
      ...(example && { example }),
      ...(format && { format }),
    };

    if (schema instanceof z.ZodString) {
      return { type: "string", ...baseSchema };
    }

    // Remove all wrappers recursively
    let currentSchema = schema;
    let previousSchema: z.ZodTypeAny | null = null;

    while (previousSchema !== currentSchema) {
      previousSchema = currentSchema;
      currentSchema = unwrapSchema(currentSchema);
    }
    schema = currentSchema;

    // Extract metadata securely
    const getMetadata = (s: z.ZodTypeAny) => {
      const def = s._def;
      return {
        description: def.description as string | undefined,
        example: (def.example || (def as any).examples?.[0]) as any,
      };
    };

    // Handler for specific types
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

    // Try to find a specific handler
    const typeName = schema._def.typeName;
    if (typeName && handlers[typeName]) {
      return handlers[typeName](schema);
    }

    // Fallback for unhandled types
    return {
      type: "object",
      description: `Unhandled Zod type: ${typeName}`,
    };
  }

  /**
   * Generates the complete Swagger specification object.
   * @returns The Swagger (OpenAPI 3) specification object.
   */
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

    // Register the requestBody schema if it exists
    this.routes.forEach((route) => {
      if (route.schema) {
        const schemaName = this.getSchemaName(route.schema);
        if (schemaName && !this.spec.components.schemas[schemaName]) {
          this.spec.components.schemas[schemaName] = this.zodToSwaggerSchema(
            route.schema
          );
        }
      }

      // Register the schemas of the responses
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

    // Processes all routes
    this.routes.forEach((route) => {
      const methodSpec: any = {
        tags: route.tags,
        summary: route.summary,
        description: route.description,
        parameters: this.buildParameters(route),
        responses: this.buildResponses(route),
      };

      if (["post", "put", "patch"].includes(route.method)) {
        methodSpec.requestBody = this.buildRequestBody(route);
      }

      if (!this.spec.paths[route.path]) {
        this.spec.paths[route.path] = {};
      }

      this.spec.paths[route.path][route.method] = methodSpec;
    });

    return this.mergeSwaggerSpecs(this.spec, this.options);
  }

  async generateSwagger2(spec?: any): Promise<any> {
    const openApiSpec = spec || this.generateSpec();

    // Conversão direta sem dependências externas
    const swagger2Doc: any = {
      swagger: "2.0",
      info: { ...openApiSpec.info },
      host: new URL(openApiSpec.servers?.[0]?.url || "http://localhost").host,
      basePath: "/",
      paths: {},
      definitions: {},
      tags: openApiSpec.tags || [],
    };

    // Convert components.schemas to definitions
    if (openApiSpec.components?.schemas) {
      swagger2Doc.definitions = openApiSpec.components.schemas;
    }

    // Convert paths
    for (const [path, methods] of Object.entries(openApiSpec.paths || {})) {
      const pathMethods = methods as Record<string, OpenAPI3Endpoint>;
      swagger2Doc.paths[path] = {};

      for (const [method, endpoint] of Object.entries(pathMethods)) {
        const swagger2Endpoint: Swagger2Endpoint = {
          tags: endpoint.tags,
          summary: endpoint.summary,
          description: endpoint.description,
          responses: {},
          ...(endpoint.parameters && { parameters: [] }),
        };

        // Convert parameters
        if (endpoint.parameters) {
          swagger2Endpoint.parameters = endpoint.parameters.map(
            (param: any) => {
              if (param.$ref) return param;
              return {
                ...param,
                ...(param.schema && { schema: param.schema }),
              };
            }
          );
        }

        // Convert requestBody
        if (endpoint.requestBody) {
          const content = endpoint.requestBody.content["application/json"];
          swagger2Endpoint.consumes = ["application/json"];
          swagger2Endpoint.parameters = [
            ...(swagger2Endpoint.parameters || []),
            {
              in: "body",
              name: "body",
              schema: content.schema,
            },
          ];
        }

        for (const [statusCode, response] of Object.entries(
          endpoint.responses || {}
        )) {
          const res = response as any;
          swagger2Endpoint.responses[statusCode] = {
            description: res.description,
            schema: res.content?.["application/json"]?.schema,
          };
        }

        swagger2Doc.paths[path][method] = swagger2Endpoint;
      }
    }
    return swagger2Doc;
  }

  /**
   * Gets the name of the schema to be used in Swagger components.
   * @param schema - Schema Zod from which to extract the name.
   * @returns Schema name in PascalCase or undefined.
   */
  private getSchemaName(schema: z.ZodTypeAny): string | undefined {
    if (schema instanceof z.ZodObject) {
      // Try to use the route's Name schema if it exists
      const route = this.routes.find((r) => r.schema === schema);
      if (route?.schemaName) {
        return route.schemaName;
      }

      // Use description if it exists
      if (schema._def?.description) {
        return schema._def.description
          .replace(/\b\w/g, (c: string) => c.toUpperCase()) // PascalCase
          .replace(/[^a-zA-Z0-9]/g, ""); // Remove caracteres especiais
      }
    }
    return undefined;
  }

  /**
   * Configure Swagger middleware in Express.
   * @param app - Express instance.
   * @param path - Path to access documentation (default: "/api-docs").
   */
  setupExpress(
    app: Express,
    options: { path?: string; useSwagger2?: boolean } = {}
  ) {
    const path = options.path || "/api-docs";
    const useSwagger2 = options.useSwagger2 || false;

    if (useSwagger2) {
      this.generateSwagger2().then((swagger2Spec) => {
        app.use(path, swaggerUi.serve, swaggerUi.setup(swagger2Spec));
      });
    } else {
      const spec = this.generateSpec();
      app.use(path, swaggerUi.serve, swaggerUi.setup(spec));
    }
  }
  /**
   * Creates the route parameters/documentation for the Swagger route.
   * @param route - The route to be processed.
   * @returns List of Swagger parameters.
   */
  private buildParameters(route: RouteDefinition): any[] {
    const parameters: any[] = [];

    const pathParams = route.path.match(/{([^}]+)}/g);
    if (pathParams) {
      pathParams.forEach((param) => {
        const paramName = param.replace(/[{}]/g, "");
        parameters.push({
          name: paramName,
          in: "path",
          required: true,
          schema: { type: "string" },
        });
      });
    }

    if (route.method === "get" && route.schema instanceof z.ZodObject) {
      parameters.push(...this.convertToParameters(route.schema));
    }

    return parameters;
  }

  /**
   * Creates the request data for POST/PUT/PATCH routes.
   * @param route - Route to be documented.
   * @returns The requestBody object for Swagger.
   */
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

  /**
   * Constructs the Swagger responses object for a route.
   * @param route - Route to be documented.
   * @returns `responses` object for the route.
   */
  private buildResponses(route: RouteDefinition): any {
    const responses: any = {};

    // First process all response schemas
    for (const [statusCode, response] of Object.entries(
      route.responses || {}
    )) {
      if (response.schema) {
        const schemaName = this.getSchemaName(response.schema);
        if (schemaName) {
          // Add to spec.components.schemas if not exists
          if (!this.spec.components.schemas[schemaName]) {
            this.spec.components.schemas[schemaName] = this.zodToSwaggerSchema(
              response.schema
            );
          }
        }
      }
    }

    // Then construct the answers
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

  private convertToParameters(schema: z.ZodObject<any>): any[] {
    const parameters: any[] = [];
    const shape = schema.shape;

    for (const [key, field] of Object.entries(shape)) {
      const zodField = field as z.ZodTypeAny;
      const isOptional = zodField instanceof z.ZodOptional;

      // Extrai a descrição do campo
      const description =
        zodField._def.description ||
        (zodField._def as any).metadata?.description;

      // Converte o schema do campo
      const fieldSchema = this.zodToSwaggerSchema(zodField);

      parameters.push({
        name: key,
        in: "query",
        required: !isOptional,
        description: description,
        schema: {
          ...fieldSchema,
          // Garante que a descrição seja incluída no schema também
          description: description || fieldSchema.description,
        },
      });
    }

    return parameters;
  }

  /**
   * Extract metadata from Zod schema as description, example format.
   * @param schema - Schema Zod than extract the metadata.
   * @returns An object containing description, example and format (when present).
   */
  private getSchemaMetadata(schema: z.ZodTypeAny): {
    description?: string;
    example?: any;
    format?: string;
  } {
    const def = schema._def;
    const metadata = def.metadata || {};
    const checks = (schema as any)._def.checks || [];

    // Extract specific formats for strings
    let format: string | undefined;
    if (schema instanceof z.ZodString) {
      if (checks.some((c: any) => c.kind === "uuid")) format = "uuid";
      else if (checks.some((c: any) => c.kind === "email")) format = "email";
      else if (checks.some((c: any) => c.kind === "datetime"))
        format = "date-time";
    }

    return {
      description: def.description || metadata.description,
      example: metadata.example || def.example || (def as any).examples?.[0],
      format,
    };
  }

  public mergeExternalDocs(docsPath: string): this {
    try {
      const specs = loadYamlSpecs(docsPath);
      specs.forEach((spec) => {
        this.options.mergeSpecs = [
          ...(this.options.mergeSpecs || []),
          {
            type: "preloaded" as const,
            content: spec,
          },
        ];
      });
    } catch (error) {
      console.error("Error loading external docs:", error);
    }
    return this;
  }

  /**
   *  Merges additional specs into the main Swagger if any.
   * @param baseSpec - The core Swagger specification.
   * @param options - Options with possible external specs.
   * @returns The combined Swagger specification.
   */
  private mergeSwaggerSpecs(
    baseSpec: any,
    options: ZodSchemaToSwaggerOptions
  ): any {
    if (!options.mergeSpecs?.length) return baseSpec;

    let mergedSpec = { ...baseSpec };
    for (const specConfig of options.mergeSpecs) {
      try {
        // Case 1: Already received the paired object (for YAMLs loaded separately)
        if (specConfig.type === "preloaded") {
          mergedSpec = deepMergeSwagger(mergedSpec, specConfig.content);
          continue;
        }

        // Case 2: File upload (original)
        const fullPath = path.resolve(specConfig.path);
        if (!fs.existsSync(fullPath)) {
          console.warn(`Swagger merge file not found: ${fullPath}`);
          continue;
        }

        const fileContent = fs.readFileSync(fullPath, "utf8");
        const externalSpec =
          specConfig.type === "json"
            ? JSON.parse(fileContent)
            : load(fileContent);

        mergedSpec = deepMergeSwagger(mergedSpec, externalSpec);
      } catch (error) {
        console.error(
          `Erro ao mesclar especificação:`,
          error instanceof Error ? error.message : error
        );
      }
    }
    return mergedSpec;
  }
}
