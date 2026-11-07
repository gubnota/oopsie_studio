import { prisma } from '@/lib/prisma';
import EncryptionService from '@/lib/encryptionService';
import { endpointURL, resolveWorkflow, validateWorkflow } from './manifest';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, rename, unlink } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';

const encryption = new EncryptionService();
const userId = 'user-with-settings';
export async function definitions() {
  const rows = await prisma.studioDefinition.findMany({ orderBy: { createdAt: 'desc' } });
  return rows.map(row => ({ ...row, document: JSON.parse(row.document) }));
}
export async function createDefinition(body: any) {
  const { kind, name, version, document, apiKey } = body;
  if (!['workflow', 'endpoint', 'model'].includes(kind) || typeof name !== 'string' || !name.trim() || name.length > 120 || typeof version !== 'string' || !/^[\w.-]{1,40}$/.test(version)) throw new Error('Kind, name and version are required');
  if (kind === 'workflow') validateWorkflow(document);
  if (kind === 'endpoint') {
    if (document?.provider !== 'comfyui') throw new Error('This registry supports ComfyUI Pods. Configure legacy Serverless integrations in Settings.');
    // Never retain arbitrary imported fields (including embedded keys) in endpoint documents.
    body.document = { provider: 'comfyui', url: endpointURL(document.url) };
  }
  if (kind === 'model') {
    if (!document?.family || !document?.source || !document?.license) throw new Error('Model family, source and license are required');
    body.document = { family: String(document.family), source: String(document.source), license: String(document.license), sha256: document.sha256 || null, verified: false };
    if (body.document.sha256 && !/^[a-f0-9]{64}$/.test(body.document.sha256)) throw new Error('Expected a SHA-256 hex digest');
  }
  const id = randomUUID();
  await prisma.$transaction(async tx => {
    await tx.studioDefinition.create({ data: { id, kind, name: name.trim(), version, document: JSON.stringify(body.document) } });
    if (kind === 'endpoint' && apiKey) {
      if (typeof apiKey !== 'string' || apiKey.length > 4096) throw new Error('Invalid credential');
      await tx.userSetting.create({ data: { userId, serviceName: `endpoint:${id}`, configKey: 'apiKey', configValue: encryption.encrypt(apiKey), isEncrypted: true } });
    }
  });
  return { id };
}
async function endpoint(id: string) {
  const definition = await prisma.studioDefinition.findUniqueOrThrow({ where: { id } });
  if (definition.kind !== 'endpoint') throw new Error('Endpoint not found');
  const config = JSON.parse(definition.document);
  const url = endpointURL(config.url);
  const credential = await prisma.userSetting.findUnique({ where: { userId_serviceName_configKey: { userId, serviceName: `endpoint:${id}`, configKey: 'apiKey' } } });
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (credential) headers.Authorization = `Bearer ${encryption.decrypt(credential.configValue)}`;
  return { url, headers };
}
async function request(config: Awaited<ReturnType<typeof endpoint>>, pathname: string, method = 'GET', body?: any) {
  // Redirects could forward credentials to another host. Paid POST is attempted exactly once here.
  return fetch(config.url + pathname, { method, headers: config.headers, redirect: 'error', signal: AbortSignal.timeout(method === 'GET' ? 20000 : 45000), ...(body ? { body: JSON.stringify(body) } : {}), cache: 'no-store' });
}
export async function testEndpoint(id: string) {
  const config = await endpoint(id);
  const response = await request(config, '/system_stats');
  if (!response.ok) throw new Error(`ComfyUI health returned HTTP ${response.status}`);
  const stats = await response.json();
  if (!stats.system || !Array.isArray(stats.devices)) throw new Error('Response is not ComfyUI system_stats');
  const objects = await request(config, '/object_info');
  if (!objects.ok) throw new Error('Cannot inspect node capabilities');
  const nodes = await objects.json();
  return { device: stats.devices[0]?.name || 'CPU', nodeCount: Object.keys(nodes).length, checkedAt: new Date().toISOString() };
}
const event = (message: string) => ({ at: new Date().toISOString(), message });
export async function submitRun(body: any) {
  const workflow = await prisma.studioDefinition.findUniqueOrThrow({ where: { id: body.workflowId } });
  if (workflow.kind !== 'workflow') throw new Error('Workflow not found');
  const graph = resolveWorkflow(JSON.parse(workflow.document), body.values || {});
  const config = await endpoint(body.endpointId);
  const objects = await request(config, '/object_info');
  if (!objects.ok) throw new Error('Cannot validate pod node capabilities');
  const nodes = await objects.json();
  for (const node of Object.values(graph)) if (!nodes[node.class_type]) throw new Error(`Pod is missing node ${node.class_type}`);
  const id = randomUUID();
  const snapshot = JSON.stringify({ schemaVersion: 1, workflow: { id: workflow.id, name: workflow.name, version: workflow.version }, endpoint: { id: body.endpointId, url: config.url }, graph, clientId: id });
  const events = [event('Submission intent saved. Never automatically resubmit this request.')];
  await prisma.studioRun.create({ data: { id, workflowId: workflow.id, endpointId: body.endpointId, snapshot, status: 'Queued', uncertain: true, events: JSON.stringify(events) } });
  try {
    const response = await request(config, '/prompt', 'POST', { prompt: graph, client_id: id });
    if (!response.ok) {
      if (response.status >= 400 && response.status < 500) {
        await prisma.studioRun.update({ where: { id }, data: { status: 'Failed', uncertain: false, error: `ComfyUI rejected graph (HTTP ${response.status}). Check graph model filenames and input values.`, events: JSON.stringify([...events, event('Graph rejected before acceptance')]) } });
        return { id };
      }
      throw new Error('Submission acknowledgement unavailable');
    }
    const result = await response.json();
    if (typeof result.prompt_id !== 'string') throw new Error('No provider prompt ID');
    await prisma.studioRun.update({ where: { id }, data: { providerId: result.prompt_id, uncertain: false, events: JSON.stringify([...events, event(`Accepted as ${result.prompt_id}`)]) } });
  } catch {
    await prisma.studioRun.update({ where: { id }, data: { error: 'Submission is uncertain. Check the pod queue/history and attach its prompt ID; do not submit again.', events: JSON.stringify([...events, event('Acknowledgement lost; reconciliation required')]) } });
  }
  return { id };
}
const locks = new Set<string>();
export async function refreshRun(id: string, attachProviderId?: string) {
  if (locks.has(id)) return;
  locks.add(id);
  try {
    let run = await prisma.studioRun.findUniqueOrThrow({ where: { id } });
    if (attachProviderId) {
      if (!run.uncertain || !/^[a-zA-Z0-9_-]{1,100}$/.test(attachProviderId)) throw new Error('Only uncertain runs accept a verified prompt ID');
      const config = await endpoint(run.endpointId);
      const history = await request(config, `/history/${encodeURIComponent(attachProviderId)}`);
      if (!history.ok) throw new Error('Cannot verify provider history');
      const entry = (await history.json())[attachProviderId];
      // ComfyUI prompt tuple: [queue number, id, graph, extra_data, outputs].
      if (entry?.prompt?.[3]?.client_id !== id) throw new Error('History client_id does not match this saved submission');
      run = await prisma.studioRun.update({ where: { id }, data: { providerId: attachProviderId, uncertain: false, error: null } });
    }
    if (!run.providerId || ['Completed', 'Failed', 'Cancelled'].includes(run.status)) return;
    const config = await endpoint(run.endpointId);
    const response = await request(config, `/history/${encodeURIComponent(run.providerId)}`);
    if (!response.ok) throw new Error(`History unavailable (HTTP ${response.status}); retry reconciliation`);
    const history = (await response.json())[run.providerId];
    if (!history) {
      const response = await request(config, '/queue');
      if (!response.ok) throw new Error('Queue unavailable; the saved run is retained');
      const queue = await response.json();
      const running = queue.queue_running?.some((item: any[]) => item[1] === run.providerId);
      const pending = queue.queue_pending?.some((item: any[]) => item[1] === run.providerId);
      await prisma.studioRun.update({ where: { id }, data: { status: running ? 'Running' : run.status, error: !running && !pending ? 'Prompt absent from queue and history. It may have been lost when the pod restarted; no automatic resubmission.' : null } });
      return;
    }
    if (history.status?.status_str === 'error') {
      await prisma.studioRun.update({ where: { id }, data: { status: 'Failed', error: 'ComfyUI execution failed. Inspect the pod log for node details.' } }); return;
    }
    if (!history.status?.completed) return;
    await prisma.studioRun.update({ where: { id }, data: { status: 'Downloading', error: null } });
    const outputs: any[] = [];
    for (const [nodeId, output] of Object.entries(history.outputs || {}) as [string, any][]) {
      for (const kind of ['images', 'gifs', 'audio']) for (const file of output[kind] || []) if (file.type === 'output') outputs.push({ ...file, nodeId });
    }
    if (!outputs.length) throw new Error('Workflow completed without saved output files. Add a SaveImage/SaveVideo output node.');
    const artifacts = JSON.parse(run.artifacts);
    const directory = path.join(process.cwd(), 'public/results', id);
    await mkdir(directory, { recursive: true });
    for (let index = artifacts.length; index < outputs.length; index++) {
      const file = outputs[index];
      const params = new URLSearchParams({ filename: file.filename, subfolder: file.subfolder || '', type: 'output' });
      const response = await fetch(config.url + '/view?' + params, { headers: config.headers, redirect: 'error', signal: AbortSignal.timeout(120000) });
      if (!response.ok || !response.body) throw new Error('Artifact download failed; reconcile to retry the download only');
      const extension = path.extname(file.filename).toLowerCase();
      if (!['.png', '.jpg', '.jpeg', '.webp', '.gif', '.mp4', '.webm', '.wav', '.mp3', '.flac'].includes(extension)) throw new Error('Unsupported artifact extension');
      const name = `${index}${extension}`, target = path.join(directory, name), partial = target + '.part';
      const hash = createHash('sha256'); let size = 0;
      try {
        await pipeline(Readable.fromWeb(response.body as any), new Transform({ transform(chunk, _, done) { size += chunk.length; if (size > 1024 ** 3) return done(new Error('Artifact exceeds 1 GiB download limit')); hash.update(chunk); done(null, chunk); } }), createWriteStream(partial, { mode: 0o600 }));
        if (!size) throw new Error('Empty artifact');
        await rename(partial, target);
      } catch (error) { await unlink(partial).catch(() => {}); throw error; }
      artifacts.push({ url: `/results/${id}/${name}`, filename: file.filename, nodeId: file.nodeId, sha256: hash.digest('hex'), size });
      await prisma.studioRun.update({ where: { id }, data: { artifacts: JSON.stringify(artifacts) } });
    }
    await prisma.studioRun.update({ where: { id }, data: { status: 'Completed', error: null, events: JSON.stringify([...JSON.parse(run.events), event('All output files downloaded and SHA-256 recorded')]) } });
  } catch (error) {
    await prisma.studioRun.update({ where: { id }, data: { error: error instanceof Error ? error.message : 'Reconciliation failed; retry polling only' } }).catch(() => {});
    throw error;
  } finally { locks.delete(id); }
}
export async function listRuns() { return (await prisma.studioRun.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })).map(run => ({ ...run, snapshot: JSON.parse(run.snapshot), artifacts: JSON.parse(run.artifacts), events: JSON.parse(run.events) })); }
