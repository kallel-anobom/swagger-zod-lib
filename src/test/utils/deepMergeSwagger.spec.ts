import {
  mergePaths,
  mergeTags,
  deepMergeSwagger,
} from "../../utils/fileManipulation/deepMergeSwagger";

describe("Swagger Merge Utilities", () => {
  describe("mergePaths", () => {
    it("should merge paths from two specs", () => {
      const target = {
        "/users": { get: { description: "Get users" } },
      };
      const source = {
        "/products": { get: { description: "Get products" } },
      };

      const result = mergePaths(target, source);
      expect(result).toEqual({
        "/users": { get: { description: "Get users" } },
        "/products": { get: { description: "Get products" } },
      });
    });

    it("should merge methods for same path", () => {
      const target = {
        "/users": { get: { description: "Get users" } },
      };
      const source = {
        "/users": { post: { description: "Create user" } },
      };

      const result = mergePaths(target, source);
      expect(result).toEqual({
        "/users": {
          get: { description: "Get users" },
          post: { description: "Create user" },
        },
      });
    });
  });

  describe("mergeTags", () => {
    it("should merge tags uniquely", () => {
      const target = [{ name: "users", description: "Users" }];
      const source = [{ name: "products", description: "Products" }];

      const result = mergeTags(target, source);
      expect(result).toEqual([
        { name: "users", description: "Users" },
        { name: "products", description: "Products" },
      ]);
    });

    it("should merge descriptions for same tags", () => {
      const target = [{ name: "users" }];
      const source = [{ name: "users", description: "Users desc" }];

      const result = mergeTags(target, source);
      expect(result).toEqual([{ name: "users", description: "Users desc" }]);
    });
  });

  describe("deepMergeSwagger", () => {
    it("should handle complete swagger specs", () => {
      const target = {
        openapi: "3.0.0",
        paths: {
          "/users": { get: { tags: ["users"] } },
        },
        tags: [{ name: "users" }],
      };

      const source = {
        paths: {
          "/products": { get: { tags: ["products"] } },
        },
        tags: [{ name: "products" }],
      };

      const result = deepMergeSwagger(target, source);
      expect(result.paths).toHaveProperty("/users");
      expect(result.paths).toHaveProperty("/products");
      expect(result.tags).toHaveLength(2);
    });
  });
});
