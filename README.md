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

### 🧪 Usando com Express

```lua
docsYml/
├── accounts/
│   ├── create.yaml
│   └── list.yaml
├── transactions/
│   ├── create.yaml
│   └── list.yaml
```

#### 📘 Exemplo 1: Documentação separada por domínio

```ts
import express from "express";
import { loadYamlSpecs, ZodSwaggerGenerator } from "swagger-zod-lib";
import * as swaggerUi from "swagger-ui-express";
import path from "path";
import fs from "fs";

const app = express();
const port = 3000;

const docsBasePath = path.join(__dirname, "docsYml");

const domains = fs
  .readdirSync(docsBasePath)
  .filter((file) => fs.statSync(path.join(docsBasePath, file)).isDirectory());

domains.forEach((domain) => {
  const yamlPath = path.join(docsBasePath, domain);
  const specs = loadYamlSpecs(yamlPath);

  const swagger = new ZodSwaggerGenerator({
    title: `${domain} API`,
    version: "1.0",
    description: `Documentação do módulo ${domain}`,
    basePath: `http://localhost:${port}/${domain}`,
    mergeSpecs: specs.map((content) => ({
      type: "preloaded" as const,
      content,
    })),
  });

  const spec = swagger.generateSpec();

  app.use(
    `/api-docs/${domain}`,
    swaggerUi.serveFiles(spec),
    swaggerUi.setup(spec)
  );
});

app.listen(port, () => {
  console.log(`Docs por domínio disponíveis em:`);
  domains.forEach((domain) => {
    console.log(`http://localhost:${port}/api-docs/${domain}`);
  });
});
```

#### 📗 Exemplo 2: Documentação única com todos os domínios

```ts
import express from "express";
import { loadYamlSpecs, ZodSwaggerGenerator } from "swagger-zod-lib";
import * as swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";

const app = express();
const port = 3000;

const docsBasePath = path.join(__dirname, "docsYml");
const allYamlContents: any[] = [];

const domains = fs
  .readdirSync(docsBasePath)
  .filter((file) => fs.statSync(path.join(docsBasePath, file)).isDirectory());

domains.forEach((domain) => {
  const yamlPath = path.join(docsBasePath, domain);
  const specs = loadYamlSpecs(yamlPath);
  allYamlContents.push(...specs);
});

const swagger = new ZodSwaggerGenerator({
  title: "Documentação Completa da API",
  version: "1.0",
  description: "Todos os módulos reunidos em um único Swagger",
  basePath: `http://localhost:${port}`,
  mergeSpecs: allYamlContents.map((content) => ({
    type: "preloaded" as const,
    content,
  })),
});

const spec = swagger.generateSpec();
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(spec));

app.listen(port, () => {
  console.log(`Swagger disponível em: http://localhost:${port}/api-docs`);
});
```

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

---

## 📟 Para que serve o CLI?

O CLI (Command Line Interface) desse projeto serve para:

📥 Carregar automaticamente specs OpenAPI (de .json, .yaml, ou .zod)

🔁 Converter schemas de ORMs para Zod (como Prisma, Mongoose e TypeORM)

🛠️ Gerar uma spec final em OpenAPI format

📤 Exportar a documentação para um arquivo .json ou .yaml

🧬 Unir specs diferentes em uma só

Ou seja: o CLI te ajuda a automatizar o processo de montar a documentação da API sem escrever manualmente os arquivos do Swagger.

### Como usar o CLI

1. 📦 Instalação global ou local
   Global (opcional)

```bash
npm install -g swagger-zod-lib
```

2. Local (recomendado no projeto)

```bash
npm install --save-dev swagger-zod-lib
```

### 🛠️ Comandos disponíveis

### Convert

Converte schemas de um ORM para Zod e gera uma spec Swagger.

```bash
npx swagger-zod-lib convert --orm=mongoose --input=./src/schemas --output=./docs/swagger.json
```

| Flag       | DescripDescriçãotion                     |
| ---------- | ---------------------------------------- |
| `--orm `   | Qual ORM usar (mongoose, prisma, typeorm |
| `--input`  | Caminho da pasta/arquivo com os schemas  |
| `--output` | Caminho onde será salvo o Swagger .json  |
| `--format` | Formato final (json ou yaml)             |

#### 📚 merge

Faz o merge de várias specs OpenAPI em uma só.

```bash
npx swagger-zod-libr merge --input=./docs --output=./dist/merged-spec.yaml
```

#### 🧪 serve

Serve a documentação em uma rota local (/docs por padrão).

```bash
npx swagger-zod-libr serve --input=./dist/swagger.json
```

### 🔁 Exemplo completo de uso

```bash
npx swagger-zod-libr convert --orm=mongoose --input=./schemas --output=./docs/swagger.json --format=json

npx swagger-zod-libr serve --input=./docs/swagger.json
```

### Contribuição

- Faça fork do projeto

- Crie sua branch (git checkout -b feature/nova-feature)

- Commit suas mudanças (git commit -am 'Adiciona nova feature')

- Push para a branch (git push origin feature/nova-feature)

- Abra um Pull Request
