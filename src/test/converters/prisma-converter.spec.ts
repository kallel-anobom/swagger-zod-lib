import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { prismaToZod } from "../../converters/prisma-converter";
import { createMockModel } from "../helpers/createMockModel";

describe("prismaToZod", () => {
  describe("with mock model", () => {
    it("should handle optional fields correctly", () => {
      const mockModel = createMockModel([
        {
          name: "id",
          type: "Int",
          isRequired: true,
          isList: false,
        },
        {
          name: "name",
          type: "String",
          isRequired: false,
          isList: false,
        },
      ]);

      const schema = prismaToZod(mockModel);

      expect(() => schema.parse({ id: 1 })).not.toThrow();
      expect(() => schema.parse({ id: 1, name: "Alice" })).not.toThrow();
      expect(() => schema.parse({ name: "Bob" })).toThrow();
    });

    it("should handle different field types", () => {
      const mockModel = createMockModel([
        { name: "id", type: "Int", isRequired: true },
        { name: "name", type: "String", isRequired: true },
        { name: "isAdmin", type: "Boolean", isRequired: false },
        { name: "scores", type: "Float", isRequired: true, isList: true },
        { name: "createdAt", type: "DateTime", isRequired: true },
      ]);

      const schema = prismaToZod(mockModel);

      const validData = {
        id: 1,
        name: "John",
        isAdmin: true,
        scores: [4.5, 3.2],
        createdAt: new Date(),
      };
      expect(() => schema.parse(validData)).not.toThrow();

      const invalidData = {
        id: "not-a-number",
        name: 123,
        scores: ["not-a-number"],
        createdAt: "not-a-date",
      };
      expect(() => schema.parse(invalidData)).toThrow();
    });

    it("should handle array fields", () => {
      const mockModel = createMockModel([
        { name: "tags", type: "String", isRequired: true, isList: true },
      ]);

      const schema = prismaToZod(mockModel);

      expect(() => schema.parse({ tags: ["tag1", "tag2"] })).not.toThrow();
      expect(() => schema.parse({ tags: "not-an-array" })).toThrow();
      expect(() => schema.parse({ tags: [1, 2] })).toThrow();
    });
  });
});
