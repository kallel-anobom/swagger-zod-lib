import { z } from "zod";
import { Schema } from "mongoose";
import { EntityTarget } from "typeorm";
import { DMMF } from "@prisma/client/runtime/library";

export interface Converters {
  prisma: () => Promise<{
    prismaToZod: (model: DMMF.Model) => z.ZodObject<any>;
  }>;
  typeorm: () => Promise<{
    typeormToZod: <T>(entity: EntityTarget<T>) => z.ZodObject<any>;
  }>;
  mongoose: () => Promise<{
    mongooseToZod: (schema: Schema) => z.ZodObject<any>;
  }>;
}
