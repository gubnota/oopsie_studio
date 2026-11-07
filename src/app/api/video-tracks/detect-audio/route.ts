import { NextRequest, NextResponse } from 'next/server';
import { mediaTool, runMedia, publicMediaPath } from '@/lib/mediaTools';
export async function POST(request: NextRequest) {
  try {
    const file = await publicMediaPath((await request.json()).videoPath);
    const { stdout } = await runMedia(mediaTool('ffprobe'), ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', file], { timeout: 10000 });
    return NextResponse.json({ hasAudio: stdout.trim() === 'audio' });
  } catch { return NextResponse.json({ error: 'Unable to inspect local media' }, { status: 400 }); }
}
