import { z } from "zod";
import { Schema } from "mongoose";

export function mongooseToZod(mongooseSchema: Schema): z.ZodSchema<any> {
  if (!mongooseSchema?.paths) {
    throw new Error(`
      Mongoose schema inválido. Certifique-se de:
      1. Ter o mongoose instalado: npm install mongoose
      2. Passar um schema válido do mongoose
    `);
  }

  const shape: Record<string, any> = {};
  const paths = mongooseSchema.paths;

  for (const path in paths) {
    const type = paths[path].instance.toLowerCase();
    const isRequired = paths[path].isRequired;

    let zodType: z.ZodTypeAny;

    switch (type) {
      case "string":
        zodType = z.string();
        break;
      case "number":
        zodType = z.number();
        break;
      case "boolean":
        zodType = z.boolean();
        break;
      case "date":
        zodType = z.date();
        break;
      case "objectid":
        zodType = z.string().regex(/^[0-9a-fA-F]{24}$/);
        break;
      case "array":
        const arrayType =
          paths[path].getEmbeddedSchemaType()?.instance?.toLowerCase() ||
          "string";
        zodType = z.array(convertBasicType(arrayType));
        break;
      default:
        zodType = z.any();
    }

    shape[path] = isRequired ? zodType : zodType.optional();
  }

  return z.object(shape);
}

function convertBasicType(type: string): z.ZodTypeAny {
  switch (type) {
    case "string":
      return z.string();
    case "number":
      return z.number();
    case "boolean":
      return z.boolean();
    case "date":
      return z.date();
    case "objectid":
      return z.string().regex(/^[0-9a-fA-F]{24}$/);
    default:
      return z.any();
  }
}
