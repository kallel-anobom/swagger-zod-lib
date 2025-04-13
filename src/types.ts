import { z } from "zod";

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
}

export interface RouteDefinition {
  path: string;
  method: "get" | "post" | "put" | "delete" | "patch";
  schema: z.ZodSchema<any>;
  responses?: Record<
    number,
    {
      description: string;
      schema?: z.ZodSchema<any>;
    }
  >;
  summary?: string;
  description?: string;
  tags?: string[];
  security?: Array<{ [securityScheme: string]: string[] }>;
}

export type DynamicImport<T> = Promise<{ default: T }>;

export type DynamicConverter<T> = {
  [K in keyof T]: () => Promise<{ [P in keyof T[K]]: T[K][P] }>;
};

export interface Converters {
  mongoose: {
    mongooseToZod: (schema: any) => import("zod").ZodSchema<any>;
  };
  prisma: {
    prismaToZod: (model: any) => import("zod").ZodSchema<any>;
  };
  typeorm: {
    typeormToZod: (entity: any) => import("zod").ZodSchema<any>;
  };
}
