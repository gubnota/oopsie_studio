import { NextRequest, NextResponse } from 'next/server';
import SettingsService from '@/lib/settingsService';
import S3Service from '@/lib/s3Service';

export async function POST(request: NextRequest) {
  const start = Date.now();
  try {
    const body = await request.json();
    const { settings } = await new SettingsService().getSettings('user-with-settings');
    let response: Response | undefined;
    if (body.service === 's3') {
      const config = { ...settings.s3, ...body.config };
      for (const field of ['accessKeyId', 'secretAccessKey'] as const) {
        if (config[field] === '••••••••') config[field] = settings.s3?.[field];
      }
      await new S3Service(config).listFiles();
    } else if (body.service === 'runpod') {
      const key = body.apiKey === '••••••••' ? settings.runpod?.apiKey : body.apiKey;
      if (!key || !/^[a-zA-Z0-9_-]{1,100}$/.test(body.endpointId || '')) throw new Error('API key and endpoint ID required');
      response = await fetch(`https://api.runpod.io/v2/${body.endpointId}/health`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15000) });
    } else if (body.service === 'elevenlabs') {
      const key = body.config?.apiKey === '••••••••' ? settings.elevenlabs?.apiKey : body.config?.apiKey;
      if (!key) throw new Error('Configure an ElevenLabs key first');
      response = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': key }, signal: AbortSignal.timeout(15000) });
    } else return NextResponse.json({ success: false, message: 'Unknown service' }, { status: 400 });
    if (response && !response.ok) throw new Error(`Service returned HTTP ${response.status}`);
    return NextResponse.json({ success: true, message: 'Connection verified', responseTime: Date.now() - start, statusCode: 200 });
  } catch {
    return NextResponse.json({ success: false, message: 'Connection failed. Check the endpoint, bucket permissions and credentials.', responseTime: Date.now() - start }, { status: 400 });
  }
}
