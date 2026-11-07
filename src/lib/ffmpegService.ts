import path from 'node:path';
import { mkdir, stat } from 'node:fs/promises';
import { mediaTool, runMedia, publicMediaPath } from './mediaTools';

export interface ThumbnailOptions { width?: number; height?: number; quality?: number; format?: 'jpg' | 'png' | 'webp' }
export class FFmpegService {
  private async run(args: string[], output?: string) {
    if (output) await mkdir(path.dirname(output), { recursive: true });
    await runMedia(mediaTool('ffmpeg'), ['-nostdin', '-y', ...args], { timeout: 120000, maxBuffer: 4 * 1024 * 1024 });
    if (output && !(await stat(output)).size) throw new Error('Media output is empty');
  }
  async extractThumbnail(input: string, output: string, options: ThumbnailOptions = {}) {
    const width = Math.round(options.width || 320), height = Math.round(options.height || 240);
    if (width < 1 || height < 1 || width > 8192 || height > 8192) throw new Error('Invalid thumbnail dimensions');
    await this.run(['-i', input, '-frames:v', '1', '-vf', `scale=${width}:${height}`, '-q:v', '3', output], output);
    return output;
  }
  async getVideoInfo(input: string) {
    const { stdout } = await runMedia(mediaTool('ffprobe'), ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', input], { timeout: 15000 });
    const data = JSON.parse(stdout), video = data.streams.find((s: {codec_type: string}) => s.codec_type === 'video');
    const [a, b] = (video?.avg_frame_rate || '0/1').split('/').map(Number);
    return { duration: Number(data.format.duration), width: video?.width || 0, height: video?.height || 0, fps: b ? a / b : 0, format: path.extname(input) };
  }
  async isFFmpegAvailable() { try { await runMedia(mediaTool('ffmpeg'), ['-version'], { timeout: 5000 }); return true; } catch { return false; } }
  async validateVideo(input: string) { try { return (await this.getVideoInfo(input)).width > 0; } catch { return false; } }
  async extractAudioFromVideo(input: string, output?: string) {
    const file = await publicMediaPath(input);
    output ||= path.join(process.cwd(), 'public/results/audio', `audio-${crypto.randomUUID()}.m4a`);
    await this.run(['-i', file, '-vn', '-c:a', 'aac', '-b:a', '192k', output], output);
    return '/' + path.relative(path.join(process.cwd(), 'public'), output);
  }
  async createMutedVideo(input: string, output?: string) {
    const file = await publicMediaPath(input);
    output ||= path.join(process.cwd(), 'public/results/video', `muted-${crypto.randomUUID()}.mp4`);
    await this.run(['-i', file, '-an', '-c:v', 'copy', output], output);
    return '/' + path.relative(path.join(process.cwd(), 'public'), output);
  }
  async trimAudio(input: string, output: string, start?: number, end?: number) {
    if ((start == null && end == null) || (start != null && (!Number.isFinite(start) || start < 0)) || (end != null && (!Number.isFinite(end) || end <= (start || 0)))) throw new Error('Invalid trim range');
    await this.run(['-i', input, ...(start == null ? [] : ['-ss', String(start)]), ...(end == null ? [] : ['-t', String(end - (start || 0))]), '-c', 'copy', output], output);
    return output;
  }
}
export const ffmpegService = new FFmpegService();
