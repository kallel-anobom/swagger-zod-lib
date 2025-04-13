export { ZodSwaggerGenerator } from "./swagger";

export type { RouteDefinition, ZodSchemaToSwaggerOptions } from "./types";

export { zodExtensions } from "./utils/zod-extensions";

import type { Converters, DynamicConverter, DynamicImport } from "./types";

export const converters: DynamicConverter<Converters> = {
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
};

// Exportação dos schemas padrão úteis
export * as commonSchemas from "./schemas/common";

// Helper types para facilitar a vida do usuário
export type {
  ZodString,
  ZodNumber,
  ZodBoolean,
  ZodObject,
  ZodArray,
  // ... outros tipos Zod conforme necessário
} from "zod";

// Exportação do Zod para conveniência (opcional)
export { z } from "zod";
