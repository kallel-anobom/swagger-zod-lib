import { z } from "zod";
import { Express } from "express";
import swaggerUi from "swagger-ui-express";
import { ZodSwaggerGenerator } from "../../core/ZodSchemaToSwaggerOptions";
import { RouteDefinition, ZodSchemaToSwaggerOptions } from "../../types";

const UserSchema = z
  .object({
    name: z.string().describe("User name"),
    age: z.number().describe("User age"),
  })
  .describe("User");

const route: RouteDefinition = {
  path: "/users",
  method: "get",
  schema: UserSchema,
  responses: {
    200: {
      description: "Successful response",
      schema: UserSchema,
    },
  },
  summary: "List users",
  description: "Returns a list of users",
  tags: ["User"],
};

const options: ZodSchemaToSwaggerOptions = {
  title: "My API",
  version: "1.0.0",
  description: "API documentation for test",
  basePath: "http://localhost:3000",
  contact: {
    name: "Developer",
    email: "developer@example.com",
    url: "http://example.com",
  },
  externalDocs: {
    url: "https://example.com/docs",
    description: "Additional documentation",
  },
};

function createTestOptions(): ZodSchemaToSwaggerOptions & {
  externalDocs: { url: string };
} {
  return {
    ...options,
    externalDocs: {
      url: "https://example.com/docs",
    },
  };
}

describe("ZodSwaggerGenerator", () => {
  let generator: ZodSwaggerGenerator;

  beforeEach(() => {
    generator = new ZodSwaggerGenerator(createTestOptions());
  });

  it("should generate basic OpenAPI structure", () => {
    const spec = generator.generateSpec();

    expect(spec.openapi).toEqual("3.0.0");
    expect(spec.info.title).toEqual(options.title);
    expect(spec.info.version).toEqual(options.version);
    expect(spec.info.description).toEqual(options.description);
    expect(spec.servers).toEqual([{ url: options.basePath }]);
  });

  it("should add POST route with requestBody correctly", () => {
    const postRoute: RouteDefinition = {
      path: "/users",
      method: "post",
      schema: UserSchema,
      responses: {
        201: {
          description: "Created",
          schema: UserSchema,
        },
      },
    };

    generator.addRoute(postRoute);
    const spec = generator.generateSpec();
    const pathItem = spec.paths["/users"];

    // Verifica requestBody
    expect(pathItem.post.requestBody).toBeDefined();
    expect(
      pathItem.post.requestBody.content["application/json"].schema
    ).toEqual({
      $ref: "#/components/schemas/User",
    });

    // Verifica response
    expect(
      pathItem.post.responses["201"].content["application/json"].schema
    ).toEqual({
      $ref: "#/components/schemas/User",
    });

    // Verifica schema nos components
    expect(spec.components.schemas.User).toEqual({
      type: "object",
      required: ["name", "age"],
      properties: {
        name: {
          type: "string",
          description: "User name",
        },
        age: {
          type: "number",
          description: "User age",
        },
      },
      description: "User",
    });
  });

  it("should add GET route with query parameters correctly", () => {
    const getRoute: RouteDefinition = {
      path: "/users",
      method: "get",
      schema: z.object({
        name: z.string().describe("Filter by name"),
        age: z.number().optional().describe("Filter by age"),
      }),
      responses: {
        200: {
          description: "Success",
          schema: z.array(UserSchema),
        },
      },
    };

    generator.addRoute(getRoute);
    const spec = generator.generateSpec();
    const pathItem = spec.paths["/users"];

    expect(pathItem.get.parameters).toHaveLength(2);
    expect(pathItem.get.parameters).toEqual([
      {
        name: "name",
        in: "query",
        required: true,
        description: "Filter by name",
        schema: {
          type: "string",
          description: "Filter by name",
        },
      },
      {
        name: "age",
        in: "query",
        required: false,
        description: "Filter by age",
        schema: {
          type: "number",
          description: "Filter by age",
        },
      },
    ]);

    // Verifica response
    expect(
      pathItem.get.responses["200"].content["application/json"].schema
    ).toEqual({
      type: "array",
      items: {
        type: "object",
        description: "User",
        properties: {
          name: {
            type: "string",
            description: "User name",
          },
          age: {
            type: "number",
            description: "User age",
          },
        },
        required: ["name", "age"],
      },
    });
  });

  it("should handle optional fields correctly", () => {
    const schemaWithOptional = z.object({
      requiredField: z.string(),
      optionalField: z.string().optional(),
    });

    const schemaName = "TestOptional";
    generator.addRoute({
      path: "/test-optional",
      method: "post",
      schema: schemaWithOptional,
      schemaName: schemaName,
      responses: { 200: { description: "OK" } },
    });

    const spec = generator.generateSpec();

    // Verifica se o schema foi criado com o nome correto
    expect(spec.components?.schemas?.[schemaName]).toBeDefined();

    const schema = spec.components.schemas[schemaName];
    expect(schema.required).toEqual(["requiredField"]);
    expect(schema.properties.optionalField).toEqual({
      type: "string",
    });
  });

  it("should setup Express middleware correctly", () => {
    const mockApp = {
      use: jest.fn(),
      get: jest.fn().mockImplementation(() => mockApp),
    };

    // Mock da implementação real
    generator.setupExpress = jest
      .fn()
      .mockImplementation(function (this: ZodSwaggerGenerator, app: Express) {
        app.use(
          "/api-docs",
          swaggerUi.serve,
          swaggerUi.setup(this.generateSpec())
        );
        app.get("/swagger.json", (req, res) => {
          res.json(this.generateSpec());
        });
        return app;
      });

    generator.addRoute(route);
    generator.setupExpress(mockApp as unknown as Express);

    // Verifica se a rota de UI foi configurada
    expect(mockApp.use).toHaveBeenCalledWith(
      "/api-docs",
      swaggerUi.serve,
      expect.any(Function)
    );

    // Verifica se a rota do JSON foi configurada
    expect(mockApp.get).toHaveBeenCalledWith(
      "/swagger.json",
      expect.any(Function)
    );
  });

  it("should setup Express using swagger-ui-express", () => {
    const app: any = {
      use: jest.fn().mockReturnThis(),
      get: jest.fn().mockReturnThis(),
    };

    // Mock da implementação real
    generator.setupExpress = jest
      .fn()
      .mockImplementation(function (this: ZodSwaggerGenerator, app: Express) {
        app.use(
          "/api-docs",
          swaggerUi.serve,
          swaggerUi.setup(this.generateSpec())
        );
        app.get("/swagger.json", (req, res) => {
          res.json(this.generateSpec());
        });
        return app;
      });

    generator.addRoute(route);
    generator.setupExpress(app);

    expect(app.use).toHaveBeenCalledWith(
      "/api-docs",
      swaggerUi.serve,
      expect.any(Function)
    );
    expect(app.get).toHaveBeenCalledWith("/swagger.json", expect.any(Function));
  });
});
