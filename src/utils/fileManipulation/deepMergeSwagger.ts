/**
 * Deeply merges two Swagger/OpenAPI specification objects, handling special sections like paths, tags and components.
 *
 * @param {any} target - Base Swagger object.
 * @param {any} source - Swagger object that will be merged into the target.
 * @returns {any} - New merged Swagger object.
 */
export function deepMergeSwagger(target: any, source: any): any {
  //  Base case for object types
  if (typeof target !== "object" || typeof source !== "object") {
    return source !== undefined ? source : target;
  }

  // Create a new object for the result
  const result: any = Array.isArray(target) ? [...target] : { ...target };

  // Special treatment for Swagger sections
  const specialSections = [
    "paths",
    "tags",
    "components",
    "security",
    "servers",
  ];

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      // Special treatment for components
      if (key === "components") {
        result.components = deepMergeComponents(
          target.components || {},
          source.components || {}
        );
        continue;
      }

      // Special treatment for paths
      if (key === "paths") {
        result.paths = mergePaths(target.paths || {}, source.paths || {});
        continue;
      }

      // Special treatment for tags
      if (key === "tags") {
        result.tags = mergeTags(target.tags || [], source.tags || []);
        continue;
      }

      // Generic merge to other properties
      if (key in target) {
        if (Array.isArray(target[key]) && Array.isArray(source[key])) {
          // For arrays, we combine single items
          result[key] = mergeArrays(target[key], source[key]);
        } else if (isObject(target[key]) && isObject(source[key])) {
          // Recursive merge for objects
          result[key] = deepMergeSwagger(target[key], source[key]);
        } else {
          // Overwrite with source value
          result[key] = source[key];
        }
      } else {
        // Add new property
        result[key] = source[key];
      }
    }
  }

  return result;
}

function deepMergeComponents(target: any, source: any): any {
  const result = { ...target };
  const componentTypes = [
    "schemas",
    "responses",
    "parameters",
    "examples",
    "requestBodies",
    "headers",
    "securitySchemes",
    "links",
    "callbacks",
  ];

  for (const type of componentTypes) {
    if (source[type]) {
      result[type] = { ...target[type], ...source[type] };
    }
  }

  return result;
}

/**
 * Merge Swagger path objects, combining HTTP methods and route parameters.
 *
 * @param {any} targetPaths - Base `paths` object.
 * @param {any} sourcePaths - `paths` object to be merged.
 * @returns {any} - New merged `paths` object.
 */
export function mergePaths(targetPaths: any, sourcePaths: any): any {
  const result = { ...targetPaths };

  for (const path in sourcePaths) {
    if (sourcePaths.hasOwnProperty(path)) {
      if (path in result) {
        // Merge HTTP methods for the same path
        result[path] = { ...result[path], ...sourcePaths[path] };

        // Merge path parameters if they exist
        if (sourcePaths[path].parameters) {
          result[path].parameters = mergeParameters(
            result[path].parameters || [],
            sourcePaths[path].parameters || []
          );
        }
      } else {
        result[path] = sourcePaths[path];
      }
    }
  }

  return result;
}

function mergeParameters(target: any[], source: any[]): any[] {
  const paramMap = new Map<string, any>();

  // Add target parameters
  target.forEach((param) => {
    if (param.name && param.in) {
      paramMap.set(`${param.name}:${param.in}`, param);
    }
  });

  // Add or override source parameters
  source.forEach((param) => {
    if (param.name && param.in) {
      paramMap.set(`${param.name}:${param.in}`, param);
    }
  });

  return Array.from(paramMap.values());
}

/**
 * Merge arrays of Swagger tags, unified by name and combining descriptions.
 *
 * @param {any[]} targetTags - Array of base tags.
 * @param {any[]} sourceTags - Array of tags to be merged.
 * @returns {any[]} - New array of merged tags.
 */
export function mergeTags(targetTags: any[], sourceTags: any[]): any[] {
  const tagMap = new Map<string, any>();

  // Add target tags
  targetTags.forEach((tag) => {
    if (tag.name) tagMap.set(tag.name, tag);
  });

  // Add or merge source tags
  sourceTags.forEach((tag) => {
    if (tag.name) {
      const existingTag = tagMap.get(tag.name);
      if (existingTag) {
        // Merge descriptions if they exist
        if (tag.description && !existingTag.description) {
          existingTag.description = tag.description;
        }
        // Merge other properties
        tagMap.set(tag.name, { ...existingTag, ...tag });
      } else {
        tagMap.set(tag.name, tag);
      }
    }
  });

  return Array.from(tagMap.values());
}

function mergeArrays(target: any[], source: any[]): any[] {
  // Combine arrays by removing duplicates based on simple identity
  const combined = [...target];
  const seen = new Set(target.map((item) => JSON.stringify(item)));

  for (const item of source) {
    const key = JSON.stringify(item);
    if (!seen.has(key)) {
      combined.push(item);
      seen.add(key);
    }
  }

  return combined;
}

function isObject(value: any): boolean {
  return value && typeof value === "object" && !Array.isArray(value);
}
