import { z } from "zod";

declare module "zod" {
  interface ZodString {
    example(example: string): this;
  }

  interface ZodType<T> {
    example(example: T extends z.ZodTypeAny ? z.infer<T> : never): this;
  }
}

export const zodExtensions = {
  /**
   * Adiciona exemplo e descrição ao schema
   */
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
