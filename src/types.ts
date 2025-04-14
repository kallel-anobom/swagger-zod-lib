import { z } from "zod";

export type CustomZodSchema = z.ZodSchema<any, any, any, any>;

export interface RouteResponse {
  description: string;
  schema?: z.ZodType<any>;
}

export interface ZodSchemaToSwaggerOptions {
  title: string;
  version: string;
  description?: string;
  basePath?: string;
  contact?: {
    name?: string;
    email?: string;
    url?: string;
  };
  components?: {
    schemas?: Record<string, any>;
    securitySchemes?: Record<string, any>;
  };
}

export interface RouteDefinition {
  path: string;
  method: "get" | "post" | "put" | "delete" | "patch";
  schema?: CustomZodSchema;
  query?: z.ZodSchema<any>;
  responses: Record<string, RouteResponse>;
  summary?: string;
  description?: string;
  tags?: string[];
  security?: Array<{ [securityScheme: string]: string[] }>;
}

export type DynamicImport<T> = Promise<{ default: T }>;

export type DynamicConverter<T> = {
  [K in keyof T]: () => Promise<{ [P in keyof T[K]]: T[K][P] }>;
};
