import type { VideoKeyFrame } from './context/StudioContext';

/** SQLite and browser routes return flat rows; the editor always consumes data. */
export function toVideoKeyframe(row: any, fallback?: VideoKeyFrame): VideoKeyFrame {
  const data = row.data ?? {
    type: row.dataType, mediaId: row.mediaId, url: row.url,
    prompt: row.prompt, fitMode: row.fitMode, volume: row.volume,
    originalDuration: row.originalDuration ?? fallback?.data.originalDuration ?? row.duration,
  };
  return { ...fallback, ...row, data };
}
