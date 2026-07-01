interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Text case conversion MCP.
 *
 * Keyless, offline: convert a string between camelCase, PascalCase, snake_case,
 * kebab-case, CONSTANT_CASE, Title Case, Sentence case, a URL slug, and more.
 * Pure functions — no API, no key.
 */


function words(text: string): string[] {
  return text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[\s_\-.\/]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

function toCase(text: string, target: string): string {
  const w = words(text);
  switch (target) {
    case 'camel': return w.map((x, i) => (i ? cap(x) : x)).join('');
    case 'pascal': return w.map(cap).join('');
    case 'snake': return w.join('_');
    case 'kebab': case 'slug': return w.join('-');
    case 'constant': return w.join('_').toUpperCase();
    case 'title': return w.map(cap).join(' ');
    case 'sentence': return w.length ? cap(w.join(' ')) : '';
    case 'lower': return w.join(' ');
    case 'upper': return w.join(' ').toUpperCase();
    case 'dot': return w.join('.');
    default: throw new Error(`Unknown case "${target}". Use camel, pascal, snake, kebab, constant, title, sentence, lower, upper, slug or dot.`);
  }
}

const CASES = ['camel', 'pascal', 'snake', 'kebab', 'constant', 'title', 'sentence', 'lower', 'upper', 'dot', 'slug'];

const tools: McpToolExport['tools'] = [
  {
    name: 'convert_case',
    description: 'Convert text to a target case: camel, pascal, snake, kebab, constant, title, sentence, lower, upper, dot, or slug (keyless, offline).',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The text to convert.' },
        target: { type: 'string', description: 'Target case: camel | pascal | snake | kebab | constant | title | sentence | lower | upper | dot | slug.' },
      },
      required: ['text', 'target'],
    },
  },
  {
    name: 'all_cases',
    description: 'Convert text to ALL supported cases at once and return them keyed by name.',
    inputSchema: { type: 'object', properties: { text: { type: 'string', description: 'The text to convert.' } }, required: ['text'] },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const text = reqStr(args, 'text', '"hello world"');
  if (name === 'convert_case') {
    const target = reqStr(args, 'target', '"snake"').toLowerCase();
    try { return { input: text, target, result: toCase(text, target) }; } catch (e) { return { error: (e as Error).message }; }
  }
  if (name === 'all_cases') {
    return { input: text, cases: Object.fromEntries(CASES.map((c) => [c, toCase(text, c)])) };
  }
  throw new Error(`Unknown tool: ${name}`);
}

function reqStr(args: Record<string, unknown>, key: string, ex: string): string {
  const v = args[key];
  if (typeof v !== 'string' || v.length === 0) throw new Error(`Required argument "${key}" is missing. Pass a string like ${ex}.`);
  return v;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
