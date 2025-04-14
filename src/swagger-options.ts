interface Components {
  schemas?: Record<string, any>;
  securitySchemes?: Record<
    string,
    {
      type: string;
      scheme?: string;
      name?: string;
      in?: string;
      bearerFormat?: string;
    }
  >;
}

export interface SwaggerOptions {
  title?: string;
  description?: string;
  version?: string;
  basePath?: string;
  externalDocs?: {
    url: string;
    description?: string;
  };
  termsOfService?: string;
  contact?: {
    name?: string;
    url?: string;
    email?: string;
  };
  license?: {
    name: string;
    url: string;
  };
  components?: Components;
}
