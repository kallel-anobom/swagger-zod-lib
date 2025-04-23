import { DMMF } from "@prisma/client/runtime/library";

export function createMockModel(
  fields: Array<Partial<DMMF.Field>>
): DMMF.Model {
  return {
    name: "MockModel",
    dbName: null,
    schema: null,
    isGenerated: false,
    idFields: [],
    uniqueFields: [],
    uniqueIndexes: [],
    primaryKey: null,
    fields: fields.map((field, index) => ({
      kind: "scalar" as const,
      name: field.name ?? `field_${index}`,
      isRequired: field.isRequired ?? false,
      isList: field.isList ?? false,
      isUnique: field.isUnique ?? false,
      isId: field.isId ?? false,
      isReadOnly: field.isReadOnly ?? false,
      type: field.type ?? "String",
      hasDefaultValue: field.hasDefaultValue ?? false,
      default: field.default ?? undefined,
      relationFromFields: field.relationFromFields ?? [],
      relationToFields: field.relationToFields ?? [],
      relationName: field.relationName ?? null,
      relationOnDelete: field.relationOnDelete,
      documentation: field.documentation ?? undefined,
      isGenerated: field.isGenerated ?? false,
      isUpdatedAt: field.isUpdatedAt ?? false,
      ...field,
    })) as unknown as DMMF.Model["fields"], // Type assertion
  } as DMMF.Model;
}
