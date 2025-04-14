// Exportação principal
export { ZodSwaggerGenerator } from "./swagger";

// Tipos
export type { RouteDefinition, ZodSchemaToSwaggerOptions } from "./types";

// Utilitários
export { zodExtensions } from "./utils/zod-extensions";

// Interface dos conversores (definida localmente)
interface Converters {
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

// Implementação dos conversores
export const converters = {
  mongoose: () =>
    import("./utils/converters/mongoose-converter").then((m) => ({
      mongooseToZod: m.mongooseToZod,
    })),
  prisma: () =>
    import("./utils/converters/prisma-converter").then((p) => ({
      prismaToZod: p.prismaToZod,
    })),
  typeorm: () =>
    import("./utils/converters/typeorm-converter").then((t) => ({
      typeormToZod: t.typeormToZod,
    })),
} satisfies Record<keyof Converters, () => Promise<any>>;

// Schemas comuns
export * as commonSchemas from "./schemas/common";

// Re-exportação do Zod
export { z } from "zod";
export type {
  ZodString,
  ZodNumber,
  ZodBoolean,
  ZodObject,
  ZodArray,
} from "zod";
