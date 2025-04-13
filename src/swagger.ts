import { SwaggerConfig, RouteConfig } from "./types";
import { z } from "zod";
import { Express } from "express";
import swaggerUi from "swagger-ui-express";

export class ZodSwaggerGenerator {
  private config: SwaggerConfig;
  private routes: RouteConfig[] = [];

  constructor(config: SwaggerConfig) {
    this.config = config;
  }

  addRoute(route: RouteConfig) {
    this.routes.push(route);
    return this;
  }

  private zodToSwaggerSchema(schema: z.ZodSchema<any>): any {
    if (schema instanceof z.ZodString) {
      return { type: "string" };
    }
    if (schema instanceof z.ZodNumber) {
      return { type: "number" };
    }
    if (schema instanceof z.ZodBoolean) {
      return { type: "boolean" };
    }
    if (schema instanceof z.ZodObject) {
      const shape = schema.shape;
      const properties: Record<string, any> = {};
      const required: string[] = [];

      for (const key in shape) {
        properties[key] = this.zodToSwaggerSchema(shape[key]);
        if (shape[key].isRequired()) {
          required.push(key);
        }
      }

      return {
        type: "object",
        properties,
        required: required.length > 0 ? required : undefined,
      };
    }
    if (schema instanceof z.ZodArray) {
      return {
        type: "array",
        items: this.zodToSwaggerSchema(schema.element),
      };
    }
    if (schema instanceof z.ZodOptional) {
      return this.zodToSwaggerSchema(schema.unwrap());
    }
    if (schema instanceof z.ZodNullable) {
      return this.zodToSwaggerSchema(schema.unwrap());
    }
    if (schema instanceof z.ZodEnum) {
      return {
        type: "string",
        enum: schema.options,
      };
    }
    if (schema instanceof z.ZodLiteral) {
      return {
        type: "string",
        enum: [schema.value],
      };
    }

    // Default fallback
    return {};
  }

  generateSpec(): any {
    const paths: Record<string, any> = {};

    for (const route of this.routes) {
      const openApiPath: any = {
        [route.method]: {
          tags: route.tags,
          summary: route.summary,
          description: route.description,
          security: route.security,
          parameters: this.buildParameters(route),
          requestBody: this.buildRequestBody(route),
          responses: this.buildResponses(route),
        },
      };

      paths[route.path] = openApiPath;
    }

    return {
      openapi: "3.0.0",
      info: {
        title: this.config.title,
        version: this.config.version,
        description: this.config.description,
      },
      servers: [{ url: this.config.basePath || "http://localhost:3000" }],
      paths,
    };
  }

  setupExpress(app: Express, path = "/api-docs"): void {
    const spec = this.generateSpec();
    app.use(path, swaggerUi.serve, swaggerUi.setup(spec));
  }

  private buildParameters(route: RouteConfig): any[] {
    const parameters: any[] = [];

    // Parâmetros de rota (ex: /users/{id})
    const pathParams = route.path.match(/\{([^}]+)\}/g) || [];
    for (const param of pathParams) {
      const paramName = param.replace(/\{|\}/g, "");
      parameters.push({
        name: paramName,
        in: "path",
        required: true,
        schema: { type: "string" }, // Tipo básico, pode ser melhorado
      });
    }

    // Parâmetros de query (para métodos GET)
    if (route.method === "get" && route.schema instanceof z.ZodObject) {
      const shape = route.schema.shape;
      for (const [key, schema] of Object.entries(shape)) {
        parameters.push({
          name: key,
          in: "query",
          required: route.schema.shape[key].isRequired(),
          schema: this.zodToSwaggerSchema(
            schema as z.ZodType<any, z.ZodTypeDef, any>
          ),
          description: (schema as z.ZodType<any, z.ZodTypeDef, any>)._def
            .description,
        });
      }
    }

    return parameters;
  }

  private buildRequestBody(route: RouteConfig): any {
    // Apenas para métodos que têm corpo (POST, PUT, PATCH)
    if (!["post", "put", "patch"].includes(route.method)) {
      return undefined;
    }

    return {
      required: true,
      content: {
        "application/json": {
          schema: this.zodToSwaggerSchema(route.schema),
        },
      },
    };
  }

  private buildResponses(route: RouteConfig): any {
    const responses: any = {};

    // Respostas definidas pelo usuário
    if (route.responses) {
      for (const [statusCode, response] of Object.entries(route.responses)) {
        responses[statusCode] = {
          description: response.description,
          content: response.schema
            ? {
                "application/json": {
                  schema: this.zodToSwaggerSchema(response.schema),
                },
              }
            : undefined,
        };
      }
    } else {
      // Resposta padrão 200
      responses["200"] = {
        description: "Successful operation",
      };
    }

    return responses;
  }
}
