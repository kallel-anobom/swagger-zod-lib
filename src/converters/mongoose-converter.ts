import { z } from "zod";
import { Schema } from "mongoose";

export function mongooseToZod(mongooseSchema: Schema): z.ZodObject<any> {
  if (!mongooseSchema?.paths) {
    throw new Error(`
      Invalid Mongoose schema. Ensure:
      1. mongoose is installed (npm install mongoose)
      2. You're passing a valid Mongoose schema instance
      3. Schema has paths defined
    `);
  }

  const shape: Record<string, z.ZodTypeAny> = {};
  const paths = mongooseSchema.paths;

  for (const path in paths) {
    try {
      const pathInfo = paths[path];
      const zodType = getZodTypeForMongoosePath(pathInfo);
      shape[path] = pathInfo.isRequired ? zodType : zodType.optional();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Error processing path ${path}: ${message}`);
    }
  }

  return z.object(shape).strict();
}

function getZodTypeForMongoosePath(pathInfo: any): z.ZodTypeAny {
  const type = pathInfo.instance?.toLowerCase();
  const schemaType = pathInfo.options?.type?.name?.toLowerCase();

  if (pathInfo.$isMongooseArray) {
    const arrayType =
      pathInfo.caster?.instance?.toLowerCase() ||
      pathInfo.options?.type[0]?.name?.toLowerCase() ||
      "string";
    return z.array(getBasicZodType(arrayType));
  }

  return getBasicZodType(type || schemaType);
}

function getBasicZodType(type: string): z.ZodTypeAny {
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
    case "buffer":
      return z.instanceof(Buffer);
    case "map":
      return z.record(z.any());
    default:
      return z.any();
  }
}
