// Inspect an isolated installation without registering a persistent Codex MCP server.
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdir, writeFile, readFile } from 'node:fs/promises';

const runtime = process.argv[2];
if (!runtime) throw new Error('Pass a directory containing node_modules/@mubit-ai/mcp.');
const root = resolve(runtime, 'node_modules');
const { Client } = await import(pathToFileURL(join(root, '@modelcontextprotocol/sdk/dist/esm/client/index.js')));
const { StdioClientTransport } = await import(pathToFileURL(join(root, '@modelcontextprotocol/sdk/dist/esm/client/stdio.js')));
const packageInfo = JSON.parse(await readFile(join(root, '@mubit-ai/mcp/package.json'), 'utf8'));
const key = process.env.MUBIT_API_KEY?.trim();
if (!key) throw new Error('MUBIT_API_KEY is missing.');
const redact = text => String(text).replaceAll(key, '[REDACTED]').replace(/\b(?:mbt_|sk-)[A-Za-z0-9_-]+/g, '[REDACTED]');
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [join(root, '@mubit-ai/mcp/dist/index.js')],
  env: { PATH: process.env.PATH ?? '', MUBIT_API_KEY: key, MUBIT_ENDPOINT: 'https://api.mubit.ai' },
  stderr: 'pipe',
});
const client = new Client({ name: 'mubit-hackathon-discovery', version: '1.0.0' });
const result = { checkedAt: new Date().toISOString(), package: packageInfo.name, version: packageInfo.version };
try {
  await client.connect(transport, { timeout: 15_000 });
  const listing = await client.listTools({}, { timeout: 15_000 });
  result.tools = listing.tools.map(({ name, description }) => ({ name, description }));
  // Deliberately call only the read-only connectivity probe, never memory writes.
  result.status = await client.callTool({ name: 'mubit_status', arguments: {} }, undefined, { timeout: 15_000 });
} catch (error) {
  result.error = redact(error.message);
  process.exitCode = 1;
} finally {
  await client.close();
  await transport.close();
}
const output = redact(JSON.stringify(result, null, 2));
await mkdir(new URL('../results/', import.meta.url), { recursive: true });
await writeFile(new URL('../results/mcp-discovery.json', import.meta.url), output + '\n', { mode: 0o600 });
console.log(output);
