#!/usr/bin/env node
require("../dist/cli/index.js");

import { Command } from "commander";
import { ZodSwaggerGenerator } from "../core/ZodSchemaToSwaggerOptions";
import { writeFileSync } from "fs";
import path from "path";
import { loadYamlSpecs } from "../utils/fileManipulation/loadYamlSpecs";

const program = new Command();

program
  .name("swagger-zod-lib")
  .description("Gera documentação Swagger a partir de esquemas Zod ou YAML")
  .version("1.0.0");

program
  .command("generate")
  .description("Gerar documentação Swagger")
  .requiredOption("-i, --input <dir>", "Diretório de entrada")
  .requiredOption("-o, --output <file>", "Arquivo de saída")
  .option("-f, --format <format>", "Formato de saída: json | yaml", "json")
  .action((options) => {
    const specs = loadYamlSpecs(options.input);

    const swagger = new ZodSwaggerGenerator({
      mergeSpecs: specs.map((content: any) => ({
        type: "preloaded" as const,
        content,
      })),
      title: "Documentação via CLI",
      version: "1.0.0",
      description: "Documentação Swagger via CLI",
    });

    const spec = swagger.generateSpec();

    const outputPath = path.resolve(process.cwd(), options.output);

    if (options.format === "yaml") {
      const yaml = require("js-yaml");
      writeFileSync(outputPath, yaml.dump(spec));
    } else {
      writeFileSync(outputPath, JSON.stringify(spec, null, 2));
    }

    console.log(`✅ Documentação gerada em: ${outputPath}`);
  });

program.parse(process.argv);
