import "reflect-metadata";
import { z } from "zod";

export function typeormToZod(entity: any): z.ZodObject<any> {
  if (!entity || !entity.constructor || !entity.constructor.name) {
    throw new Error(
      "Entidade TypeORM inválida. Verifique se:\n" +
        "1. Você instalou o typeorm (npm install typeorm)\n" +
        "2. Está passando uma entidade válida do TypeORM"
    );
  }

  const metadata = Reflect.getMetadata("orm:columns", entity) || [];
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const column of metadata) {
    let zodType: z.ZodTypeAny;

    switch (column.type) {
      case String:
        zodType = z.string();
        break;
      case Number:
        zodType = z.number();
        break;
      case Boolean:
        zodType = z.boolean();
        break;
      case Date:
        zodType = z.date();
        break;
      default:
        zodType = z.any();
    }

    if (column.isArray) {
      zodType = z.array(zodType);
    }

    shape[column.propertyName] = column.isNullable
      ? zodType.optional()
      : zodType;
  }

  return z.object(shape);
}
