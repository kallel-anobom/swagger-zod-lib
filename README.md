# 🚀 Swagger Zod Lib

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/nome-da-sua-lib.svg)](https://badge.fury.io/js/swagger-zod-lib)

Este projeto fornece uma forma flexível de gerar a documentação Swagger da sua API, podendo carregar múltiplas fontes de especificação, combiná-las e servir em uma rota personalizada.

Você pode:

- Usar arquivos .yaml ou .json contendo a spec OpenAPI
- Usar schemas criados com Zod
- Converter schemas de ORMs (como Prisma, Mongoose, TypeORM) para Zod e gerar a documentação automaticamente
- Múltiplos domínios/entidades

## 🛠️ Recursos

- 📄 Geração automática de documentação a partir de schemas Zod
- 🗃️ Suporte a schemas de ORMs populares
- 📦 Importação de documentação via YAML ou JSON
- 🚀 Rota única ou rotas separadas por entidades
- 🔄 Validação integrada com Zod

## 🚀 Como rodar a aplicação

```bash
npm install swagger-zod-lib swagger-ui-express
# ou
yarn add swagger-zod-lib swagger-ui-express

```

## 📂 Formas de carregar as specs

1. Usando arquivos .yaml ou .json

```ts
import { loadYamlSpecs } from "./utils";

const specs = loadYamlSpecs("./docs");
```

#### Aceita:

- Um único arquivo
- Um diretório contendo múltiplos arquivos .yaml ou .yml

## 📝 Uso Básico

#### 1. Usando Zod diretamente

```ts
import { z } from "zod";
import { ZodSwaggerGenerator } from "swagger-zod-lib";

const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
});

const swagger = new ZodSwaggerGenerator({
  title: "User API",
  version: "1.0",
  schemas: {
    User: userSchema,
  },
});
```

#### 2. Usando com arquivos YAML/JSON

```ts
# docs.yaml
openapi: 3.0.0
info:
  title: Accounts API
  version: 1.0.0
paths:
  /accounts/verify:
    post:
      tags: [accounts]
      summary: Verificar conta
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                document: { type: string }
              required: [document]
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  id: { type: string }
                  status: {
                    type: string
                    enum: [CREATED, PENDING, ENABLED, BLOCKED]
                  }
```

### 4. Merge de Múltiplas Fontes

```ts
new ZodSwaggerGenerator({
  mergeSpecs: [
    { type: "preloaded", content: yamlContent },
    { type: "zod", schema: userSchema, path: "/users" },
    { type: "file", path: "./schemas/payment.yaml" },
  ],
});
```

### 5. Usando schemas de ORMs

Você pode converter dinamicamente schemas dos principais ORMs para Zod:

```ts
import { mongooseToZod } from "./converters/mongoose-converter";
import mongoose from "mongoose";

const userMongooseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number },
});

const userZodSchema = mongooseToZod(userMongooseSchema);
```

### 🧬 6. Unificando múltiplas specs

Você pode combinar várias specs utilizando deepMergeSwagger, respeitando as seções do OpenAPI como paths, components, tags, etc:

```ts
import { deepMergeSwagger } from "./utils";

const finalSpec = deepMergeSwagger(spec1, spec2);
```

### 📌 7. Rotas

Você pode servir a documentação em uma única rota (/docs)

Ou gerar rotas específicas por entidade (ex: /docs/users, /docs/products)

#### Rotas Disponíveis:

/api-docs - Docs unificados (se configurado)

/api-docs/{domain} - Docs por domínio (ex: /api-docs/accounts)

### 8. Configuração de Segurança

```ts
paths:
  /secure:
    get:
      security:
        - bearerAuth: []
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

#### Suporte a seções especiais do Swagger

O merge de múltiplas specs lida com:

- paths → mescla endpoints
- tags → evita duplicação
- components.schemas → combina schemas
- parameters → resolve conflitos por name + in

### Contribuição

- Faça fork do projeto

- Crie sua branch (git checkout -b feature/nova-feature)

- Commit suas mudanças (git commit -am 'Adiciona nova feature')

- Push para a branch (git push origin feature/nova-feature)

- Abra um Pull Request
