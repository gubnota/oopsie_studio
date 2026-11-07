import { NextRequest, NextResponse } from 'next/server';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'node:path';
import { mkdir, rename, unlink } from 'node:fs/promises';
import http from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { mediaTool, publicMediaPath, runMedia } from '@/lib/mediaTools';

export async function GET() { return NextResponse.json({ status: 'ok' }); }
export async function POST(request: NextRequest) {
  let mediaServer: http.Server | undefined;
  try {
    const { project, tracks = [], keyframes = {}, options = {} } = await request.json();
    if (!project || !Array.isArray(tracks)) throw new Error('Project and tracks are required');
    const format = options.format || 'mp4';
    if (!['mp4', 'webm'].includes(format) || (process.env.OOPSIE_MEDIA_BIN && format !== 'mp4')) throw new Error('This desktop build exports MP4 using Apple hardware encoding');
    if (!tracks.length || !Object.values(keyframes).some((value: any) => value?.length)) throw new Error('Add media to the timeline first');
    const directory = path.join(process.cwd(), 'public/exports');
    await mkdir(directory, { recursive: true });
    const id = crypto.randomUUID(), output = path.join(directory, `${id}.${format}`);
    const serveUrl = process.env.OOPSIE_REMOTION_BUNDLE || await bundle({ entryPoint: path.join(process.cwd(), 'src/lib/remotion/index.tsx'), webpackOverride: config => ({ ...config, resolve: { ...config.resolve, alias: { ...config.resolve?.alias, '@': path.join(process.cwd(), 'src') } } }) });
    // Short-lived read-only media lease for the isolated rendering browser. Never passes the desktop session cookie to remote media.
    const files = new Map<string, string>();
    mediaServer = http.createServer((req, res) => {
      const file = files.get(req.url || '');
      if (!file || req.method !== 'GET') { res.writeHead(404).end(); return; }
      res.setHeader('Access-Control-Allow-Origin', '*');
      const { size } = statSync(file);
      const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
      const start = range ? Number(range[1]) : 0, end = range?.[2] ? Math.min(Number(range[2]),size-1) : size-1;
      if (start > end || start >= size) { res.writeHead(416).end(); return; }
      res.writeHead(range ? 206 : 200, {'Content-Length':end-start+1,'Accept-Ranges':'bytes',...(range ? {'Content-Range':`bytes ${start}-${end}/${size}`} : {})});
      createReadStream(file, {start,end}).on('error', () => res.destroy()).pipe(res);
    });
    await new Promise<void>(resolve => mediaServer!.listen(0, '127.0.0.1', resolve));
    const port = (mediaServer.address() as {port: number}).port;
    const processed: Record<string, any[]> = {};
    const audio: {file: string; time: number; volume: number}[] = [];
    for (const [trackId, frames] of Object.entries(keyframes)) {
      processed[trackId] = [];
      const track = tracks.find((item: any) => item.id === trackId);
      for (const frame of frames as any[]) {
        let url = frame.data?.url || frame.url;
        let file = url;
        if (!url || url.startsWith('blob:')) throw new Error('Save timeline media before exporting');
        if (!url.startsWith('https://')) {
          if (url.startsWith('http')) { const parsed = new URL(url); if (parsed.origin !== request.nextUrl.origin) throw new Error('Only HTTPS remote media is supported'); url = parsed.pathname; }
          file = await publicMediaPath(url);
          const lease = '/' + crypto.randomUUID(); files.set(lease, file);
          url = `http://127.0.0.1:${port}${lease}`;
        }
        processed[trackId].push({ ...frame, data: { ...frame.data, url } });
        if (['music', 'voiceover'].includes(track?.type) && !track.muted) {
          const time = Number(frame.timestamp || 0) / 1000, volume = Number(frame.data?.volume ?? track.volume ?? 100) / 100;
          if (!Number.isFinite(time) || time < 0 || !Number.isFinite(volume) || volume < 0 || volume > 2) throw new Error('Invalid audio timing or volume');
          audio.push({ file, time, volume });
        }
      }
    }
    const inputProps = { project, tracks, keyframes: processed };
    const browserExecutable = process.env.OOPSIE_BROWSER;
    const binariesDirectory = process.env.OOPSIE_MEDIA_BIN;
    const composition = await selectComposition({ serveUrl, id: 'MainComposition', inputProps, browserExecutable, binariesDirectory });
    if (composition.width > 7680 || composition.height > 7680 || composition.durationInFrames > 30 * 3600) throw new Error('Export exceeds size or duration limits');
    await renderMedia({ composition, serveUrl, inputProps, codec: format === 'webm' ? 'vp8' : 'h264', outputLocation: output, browserExecutable, binariesDirectory, ...(binariesDirectory ? { hardwareAcceleration: 'required' as const } : {}) });
    if (audio.length) {
      const temp = path.join(directory, `${id}-silent.${format}`);
      await rename(output, temp);
      try {
        const filters = audio.map((item, i) => `[${i + 1}:a]volume=${item.volume},adelay=${Math.round(item.time * 1000)}:all=1[a${i}]`).join(';') + ';' + audio.map((_, i) => `[a${i}]`).join('') + `amix=inputs=${audio.length}:duration=longest[aout]`;
        await runMedia(mediaTool('ffmpeg'), ['-nostdin', '-y', '-i', temp, ...audio.flatMap(item => ['-i', item.file]), '-filter_complex', filters, '-map', '0:v:0', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', output], { timeout: 300000, maxBuffer: 4 * 1024 * 1024 });
      } finally { await unlink(temp).catch(() => {}); }
    }
    return NextResponse.json({ success: true, downloadUrl: `/exports/${id}.${format}`, filename: `${id}.${format}` });
  } catch (error) {
    return NextResponse.json({ success: false, error: { message: error instanceof Error ? error.message : 'Export failed' } }, { status: 400 });
  } finally { mediaServer?.close(); }
}
