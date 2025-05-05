export function updateSchemaRefs(spec: any): any {
  const jsonStr = JSON.stringify(spec);
  const updatedStr = jsonStr.replace(
    /#\/components\/schemas\//g,
    "#/definitions/"
  );
  return JSON.parse(updatedStr);
}
