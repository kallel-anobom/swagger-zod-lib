import { z } from "zod";
import { dmmf } from "@prisma/client";

export function prismaToZod(model: dmmf): z.ZodSchema<any> {
  const shape: Record<string, any> = {};

  if (!model?.fields) {
    throw new Error(`
      Model Prisma inválido. Certifique-se de:
      1. Ter @prisma/client instalado: npm install @prisma/client
      2. Gerar o cliente Prisma: npx prisma generate
    `);
  }

  for (const field of model.fields) {
    let zodType: z.ZodTypeAny;

    switch (field.type) {
      case "String":
        zodType = z.string();
        break;
      case "Int":
      case "Float":
      case "Decimal":
        zodType = z.number();
        break;
      case "Boolean":
        zodType = z.boolean();
        break;
      case "DateTime":
        zodType = z.date();
        break;
      case "Json":
        zodType = z.any();
        break;
      default:
        zodType = z.any();
    }

    if (field.isList) {
      zodType = z.array(zodType);
    }

    shape[field.name] = field.isRequired ? zodType : zodType.optional();
  }

  return z.object(shape);
}
