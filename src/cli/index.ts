#!/usr/bin/env node
import { Command } from "commander";
import { ZodSwaggerGenerator } from "../core/ZodSchemaToSwaggerOptions";
import { writeFileSync } from "fs";
import path from "path";
import { loadYamlSpecs } from "../utils/fileManipulation/loadYamlSpecs";
import * as yaml from "js-yaml";

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
  .option("--swagger2", "Gerar no formato Swagger 2.0 (padrão: OpenAPI 3.0)")
  .action(async (options) => {
    try {
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

      let spec;

      if (options.swagger2) {
        // Generates Swagger 2.0
        spec = await swagger.generateSwagger2();
      } else {
        // Generates OpenAPI 3.0 (default)
        spec = swagger.generateSpec();
      }

      const outputPath = path.resolve(process.cwd(), options.output);

      if (options.format === "yaml") {
        writeFileSync(outputPath, yaml.dump(spec));
      } else {
        writeFileSync(outputPath, JSON.stringify(spec, null, 2));
      }

      console.log(
        `✅ Documentação ${
          options.swagger2 ? "Swagger 2.0" : "OpenAPI 3.0"
        } gerada em: ${outputPath}`
      );
    } catch (error) {
      console.error(
        "❌ Erro ao gerar documentação:",
        error instanceof Error ? error.message : error
      );
      process.exit(1);
    }
  });

program.parse(process.argv);
