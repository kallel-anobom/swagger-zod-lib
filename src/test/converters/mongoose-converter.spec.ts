import { mongooseToZod } from "../../converters/mongoose-converter";
import { z } from "zod";
import { Schema } from "mongoose";

describe("mongooseToZod", () => {
  it("should convert basic schema to Zod", () => {
    const userSchema = new Schema({
      name: { type: String, required: true },
      age: { type: Number, required: true },
      email: { type: String, required: true, match: /.+@.+\..+/ },
    });

    const zodSchema = mongooseToZod(userSchema);

    const validData = { name: "John", email: "john@example.com" };
    expect(() => zodSchema.parse(validData).not.toThrow());

    const invalidData = { name: 123, email: "invalid-email" };
    expect(() => zodSchema.parse(invalidData)).toThrow();
  });

  it("should handle nested schemas", () => {
    const addressSchema = new Schema({
      street: String,
      city: { type: String, required: true },
    });

    const userSchema = new Schema({
      name: String,
      address: addressSchema,
    });

    const zodSchema = mongooseToZod(userSchema);

    const validData = {
      name: "John",
      address: { city: "São Paulo" },
    };
    expect(() => zodSchema.parse(validData)).not.toThrow();
  });

  it("should handle arrays", () => {
    const productSchema = new Schema({
      tags: [String],
      prices: [{ value: Number }],
    });

    const zodSchema = mongooseToZod(productSchema);

    const validData = {
      tags: ["tech", "book"],
      prices: [{ value: 10.99 }],
    };
    expect(() => zodSchema.parse(validData)).not.toThrow();
  });
});
