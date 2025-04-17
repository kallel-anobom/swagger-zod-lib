import { z } from "zod";
import { DMMF } from "@prisma/client/runtime/library";

export function prismaToZod(model: DMMF.Model): z.ZodObject<any> {
  if (!model?.fields) {
    throw new Error(`
      Invalid Prisma model. Ensure:
      1. @prisma/client is installed
      2. You've run 'prisma generate'
      3. You're passing a valid model (e.g., prisma.user.$dmmf)
      4. Model has fields defined
    `);
  }

  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of model.fields) {
    try {
      let zodType = mapPrismaTypeToZod(field.type, field.isList);

      if (field.documentation) {
        zodType = zodType.describe(field.documentation);
      }

      shape[field.name] = field.isRequired ? zodType : zodType.optional();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Error processing field ${field.name}: ${message}`);
    }
  }

  return z.object(shape);
}

function mapPrismaTypeToZod(type: string, isList: boolean): z.ZodTypeAny {
  const baseType = (() => {
    switch (type) {
      case "String":
        return z.string();
      case "Int":
      case "Float":
      case "Decimal":
        return z.number();
      case "Boolean":
        return z.boolean();
      case "DateTime":
        return z.date();
      case "Json":
        return z.any();
      default:
        return z.unknown();
    }
  })();

  return isList ? z.array(baseType) : baseType;
}
