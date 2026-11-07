export type Binding = { key: string; label: string; node: string; input: string; type: 'string' | 'number' | 'boolean' | 'enum' | 'json'; default?: any; min?: number; max?: number; options?: string[] };
export type Workflow = { schemaVersion: 1; graph: Record<string, { class_type: string; inputs: Record<string, any>; [key: string]: any }>; bindings: Binding[] };
const plain = (value: any) => value && typeof value === 'object' && !Array.isArray(value);
export function validateWorkflow(value: any): asserts value is Workflow {
  if (value?.schemaVersion !== 1 || !plain(value.graph) || !Object.keys(value.graph).length || !Array.isArray(value.bindings)) throw new Error('Expected schemaVersion 1, an API-format graph and bindings array. Export API format from ComfyUI.');
  if (Object.keys(value.graph).length > 2000 || value.bindings.length > 100) throw new Error('Workflow is too large');
  for (const [id, node] of Object.entries(value.graph) as [string, any][]) {
    if (!/^\d+$/.test(id) || !node?.class_type || !plain(node.inputs)) throw new Error(`Invalid API node ${id}`);
  }
  const keys = new Set();
  for (const field of value.bindings as Binding[]) {
    if (!/^[a-zA-Z][\w-]{0,63}$/.test(field.key) || keys.has(field.key) || !['string', 'number', 'boolean', 'enum', 'json'].includes(field.type)) throw new Error('Invalid or duplicate binding');
    keys.add(field.key);
    if (!Object.hasOwn(value.graph[field.node]?.inputs || {}, field.input)) throw new Error(`Missing mapping ${field.node}.${field.input}`);
    if (field.type === 'enum' && (!field.options?.length || field.options.some(v => typeof v !== 'string'))) throw new Error('Enum options are required');
    if (field.min !== undefined && !Number.isFinite(field.min) || field.max !== undefined && !Number.isFinite(field.max)) throw new Error('Invalid numeric bounds');
  }
}
export function resolveWorkflow(workflow: Workflow, values: Record<string, any>) {
  validateWorkflow(workflow);
  if (!plain(values)) throw new Error('Workflow values must be an object');
  const graph = structuredClone(workflow.graph);
  for (const key of Object.keys(values)) if (!workflow.bindings.some(field => field.key === key)) throw new Error(`Unknown parameter ${key}`);
  for (const field of workflow.bindings) {
    const value = values[field.key] ?? field.default ?? graph[field.node].inputs[field.input];
    if (field.type === 'number' && (typeof value !== 'number' || !Number.isFinite(value) || field.min !== undefined && value < field.min || field.max !== undefined && value > field.max)) throw new Error(`Invalid ${field.label}`);
    if (field.type === 'boolean' && typeof value !== 'boolean' || field.type === 'string' && typeof value !== 'string' || field.type === 'enum' && !field.options!.includes(value)) throw new Error(`Invalid ${field.label}`);
    if (JSON.stringify(value)?.length > 100000) throw new Error('Parameter is too large');
    graph[field.node].inputs[field.input] = value;
  }
  return graph;
}
export function endpointURL(value: string) {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' || url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname))) throw new Error('Use an HTTPS ComfyUI origin, or local HTTP for testing');
  return url.origin;
}
