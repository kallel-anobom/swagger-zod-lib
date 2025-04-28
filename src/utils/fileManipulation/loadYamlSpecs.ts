import * as fs from "fs";
import * as path from "path";
import { load } from "js-yaml";

/**
 * Loads one or more YAML files from a specific path (single file or directory).
 *
 * @param {string} docsPath - Path to the file or directory containing `.yaml` or `.yml` files.
 * @returns {any[]} - Array with the contents of the loaded YAML files.
 */
export function loadYamlSpecs(docsPath: string): any[] {
  const fullPath = path.resolve(docsPath);

  // Check if it is a single file or directory
  if (fs.statSync(fullPath).isFile()) {
    return [load(fs.readFileSync(fullPath, "utf8"))];
  }

  // Load all YAMLs from a directory
  return fs
    .readdirSync(fullPath)
    .filter((file) => file.endsWith(".yaml") || file.endsWith(".yml"))
    .map((file) => load(fs.readFileSync(path.join(fullPath, file), "utf8")));
}
