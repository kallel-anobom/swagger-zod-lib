import { z } from "zod";
import { EntityTarget, getMetadataArgsStorage } from "typeorm";

export function typeormToZod<T>(entity: EntityTarget<T>): z.ZodObject<any> {
  const metadataStorage = getMetadataArgsStorage();

  if (!entity) {
    throw new Error(`
      Invalid TypeORM entity target. Ensure:
      1. typeorm and reflect-metadata are installed
      2. You're passing either:
        - An @Entity() decorated class
        - A registered entity name
      3. You've imported 'reflect-metadata' in your app entry point
    `);
  }

  const entityMetadata = metadataStorage.tables.find((table) => {
    if (typeof entity === "string") {
      return typeof table.target === "function" && table.target.name === entity;
    }
    return table.target === entity;
  });

  if (!entityMetadata) {
    const entityName = typeof entity === "function" ? entity.name : entity;
    throw new Error(`No TypeORM metadata found for entity '${entityName}'. 
      Ensure the class is properly decorated with @Entity()`);
  }

  const columns = metadataStorage.columns.filter((col) => {
    if (typeof entity === "string") {
      return typeof col.target === "function" && col.target.name === entity;
    }
    return col.target === entity;
  });

  const shape: Record<string, z.ZodTypeAny> = {};

  for (const column of columns) {
    try {
      const zodType = getZodTypeForTypeORMColumn(column);
      const isNullable =
        column.options.nullable || column.options.nullable === undefined;
      shape[column.propertyName] = isNullable ? zodType.optional() : zodType;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(
        `Error processing column ${column.propertyName}: ${message}`
      );
    }
  }

  return z.object(shape).strict();
}

function getZodTypeForTypeORMColumn(column: any): z.ZodTypeAny {
  const type = column.type instanceof Function ? column.type.name : column.type;

  switch (type) {
    case "String":
      return z.string();
    case "Number":
      return z.number();
    case "Boolean":
      return z.boolean();
    case "Date":
      return z.date();
    case "ObjectID":
      return z.string().regex(/^[0-9a-fA-F]{24}$/);
    case "Json":
      return z.any();
    default:
      if (column.isArray) return z.array(z.any());
      return z.unknown();
  }
}
