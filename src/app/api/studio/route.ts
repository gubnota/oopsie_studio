import { NextRequest, NextResponse } from 'next/server';
import { createDefinition, definitions, listRuns, refreshRun, submitRun, testEndpoint } from '@/lib/workflows/studioService';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try { return NextResponse.json({ definitions: await definitions(), runs: await listRuns() }); }
  catch { return NextResponse.json({ error: 'Studio database is unavailable. Initialize the database before starting browser mode.' }, { status: 500 }); }
}
export async function POST(request: NextRequest) {
  try {
    const text = await request.text();
    if (text.length > 2 * 1024 * 1024) throw new Error('Import exceeds 2 MiB');
    const body = JSON.parse(text);
    let result;
    switch (body.action) {
      case 'define': result = await createDefinition(body); break;
      case 'test': result = await testEndpoint(body.id); break;
      case 'submit': result = await submitRun(body); break;
      case 'refresh': await refreshRun(body.id, body.providerId); result = { success: true }; break;
      default: throw new Error('Unknown action');
    }
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Studio request failed';
    return NextResponse.json({ error: message.includes('Unique constraint') ? 'That name and version already exist. Create a new version.' : message.includes('prisma.') ? 'Database operation failed' : message }, { status: 400 });
  }
}
