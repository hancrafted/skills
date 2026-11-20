import { Document, isMap, parseDocument, type YAMLMap } from 'yaml';

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isText = (value: unknown): value is string => typeof value === 'string' && value !== '';

export function openMapping(existing: string | null, label: string): { doc: Document; root: YAMLMap } {
  const doc = existing === null ? new Document({}) : parseDocument(existing);
  if (doc.errors.length > 0) throw new Error(`${label} is not valid YAML: ${doc.errors[0]?.message}`);
  if (doc.contents === null) doc.contents = doc.createNode({}) as YAMLMap;
  if (!isMap(doc.contents)) throw new Error(`${label} must be a mapping`);
  return { doc, root: doc.contents };
}
