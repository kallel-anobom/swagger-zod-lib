import { typeormToZod } from "../../converters/typeorm-converter";
import { z } from "zod";

class MockUser {}

describe("typeormToZod", () => {
  it("should convert TypeORM entity to Zod", () => {
    // Mock dos metadados do TypeORM
    const mockMetadata = {
      tables: [
        {
          target: MockUser,
          name: "mock_user",
        },
      ],
      columns: [
        {
          propertyName: "id",
          target: MockUser,
          type: Number,
          options: { nullable: false },
        },
        {
          propertyName: "name",
          target: MockUser,
          type: String,
          options: { nullable: false },
        },
        {
          propertyName: "age",
          target: MockUser,
          type: Number,
          options: { nullable: true },
        },
        {
          propertyName: "tags",
          target: MockUser,
          type: "simple-array",
          options: { nullable: true },
        },
      ],
    };

    // Mock do getMetadataArgsStorage
    jest.mock("typeorm", () => ({
      getMetadataArgsStorage: () => mockMetadata,
    }));

    const { typeormToZod } = require("../../converters/typeorm-converter");
    const zodSchema = typeormToZod(MockUser);

    const validData = { id: 1, name: "John" };
    expect(() => zodSchema.parse(validData)).not.toThrow();

    const invalidData = { id: "not-a-number", name: 123 };
    expect(() => zodSchema.parse(invalidData)).toThrow();
  });
});
