import { z } from "zod";
import { CustomZodSchema } from "../types/";

declare module "zod" {
  interface ZodString {
    example(example: string): this;
  }

  interface ZodType<
    Output = any,
    Def extends z.ZodTypeDef = z.ZodTypeDef,
    Input = Output,
    T = unknown
  > {
    example(example: T extends z.ZodTypeAny ? z.infer<T> : never): this;
  }

  export interface Converters {
    mongoose: {
      mongooseToZod: (schema: any) => CustomZodSchema;
    };
    prisma: {
      prismaToZod: (model: any) => CustomZodSchema;
    };
    typeorm: {
      typeormToZod: (entity: any) => CustomZodSchema;
    };
  }
}

export const zodExtensions = {
  withExample<T extends z.ZodTypeAny>(
    schema: T,
    meta: {
      description?: string;
      example?: z.infer<T>;
    }
  ): T {
    return schema.describe(meta.description || "").transform((s) => {
      (s as any).example = meta.example;
      return s;
    }) as unknown as T;
  },
};
