// Main Export
export { ZodSwaggerGenerator } from "./core/ZodSchemaToSwaggerOptions";

// Types
export type { RouteDefinition, ZodSchemaToSwaggerOptions } from "./types";

// Utilities
export { zodExtensions } from "./utils/zod-extensions";
export { loadYamlSpecs } from "./utils/fileManipulation/file";

// Converter interface (locally defined)
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

// Implementation of converters
export const converters = {
  mongoose: () =>
    import("./converters/mongoose-converter").then((m) => ({
      mongooseToZod: m.mongooseToZod,
    })),
  prisma: () =>
    import("./converters/prisma-converter").then((p) => ({
      prismaToZod: p.prismaToZod,
    })),
  typeorm: () =>
    import("./converters/typeorm-converter").then((t) => ({
      typeormToZod: t.typeormToZod,
    })),
} satisfies Record<keyof Converters, () => Promise<any>>;

// Common schemas
export * as commonSchemas from "./schemas/common";

// Zod Re-export
export { z } from "zod";
export type {
  ZodString,
  ZodNumber,
  ZodBoolean,
  ZodObject,
  ZodArray,
} from "zod";
