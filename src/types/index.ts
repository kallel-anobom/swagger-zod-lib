import { z } from "zod";
import { SwaggerOptions } from "../swagger-options";

export type CustomZodSchema = z.ZodSchema<any, any, any, any>;

export interface RouteResponse {
  description: string;
  schema?: z.ZodType<any>;
}

export interface ZodSchemaToSwaggerOptions extends SwaggerOptions {
  title: string;
  version: string;
  description: string;
  basePath?: string;
  contact?: {
    name?: string;
    email?: string;
    url?: string;
  };
  components?: {
    schemas?: Record<string, any>;
    securitySchemes?: Record<string, any>;
    responses?: Record<string, any>;
  };
  externalDocs?: {
    description?: string;
    url: string;
  };
  mergeSpecs?: Array<MergeSpecConfig>;
}

export interface RouteDefinition {
  path: string;
  method: "get" | "post" | "put" | "delete" | "patch";
  schema?: CustomZodSchema;
  schemaName?: string;
  query?: z.ZodSchema<any>;
  responses: Record<string, RouteResponse>;
  summary?: string;
  description?: string;
  tags?: string[];
  security?: Array<{ [securityScheme: string]: string[] }>;
}

export interface Swagger2Endpoint {
  tags?: string[];
  summary?: string;
  description?: string;
  parameters?: any[];
  responses: Record<string, any>;
  consumes?: string[];
}

export interface OpenAPI3Endpoint {
  tags?: string[];
  summary?: string;
  description?: string;
  parameters?: any[];
  requestBody?: {
    content: {
      "application/json": {
        schema: any;
      };
    };
  };
  responses: Record<string, any>;
}

export type DynamicImport<T> = Promise<{ default: T }>;

export type DynamicConverter<T> = {
  [K in keyof T]: () => Promise<{ [P in keyof T[K]]: T[K][P] }>;
};

export type MergeSpecConfig =
  | { type: "json" | "yaml"; path: string }
  | { type: "preloaded"; content: any };
