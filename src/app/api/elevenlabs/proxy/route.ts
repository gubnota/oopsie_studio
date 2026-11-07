import { NextRequest, NextResponse } from 'next/server';
import SettingsService from '@/lib/settingsService';

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path') || '';
  if (!/^(voices(?:\/[a-zA-Z0-9_-]+(?:\/samples(?:\/[a-zA-Z0-9_-]+\/audio)?)?)?|models)$/.test(path)) {
    return NextResponse.json({ error: 'Unsupported voice resource' }, { status: 400 });
  }
  const key = await new SettingsService().getDecryptedSetting('user-with-settings', 'elevenlabs', 'apiKey');
  if (!key) return NextResponse.json({ error: 'Configure ElevenLabs in Settings' }, { status: 409 });
  const response = await fetch(`https://api.elevenlabs.io/v1/${path}`, {
    headers: { 'xi-api-key': key }, signal: AbortSignal.timeout(30000), redirect: 'error',
  });
  return new Response(response.body, { status: response.status, headers: {
    'Content-Type': response.headers.get('content-type') || 'application/json', 'Cache-Control': 'no-store',
  }});
}
