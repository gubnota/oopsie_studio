'use client';
import { useState } from 'react';
import { useStudio, type VideoTrack } from '@/lib/context/StudioContext';
import { normalizeUrl } from '@/lib/utils';

function mediaDuration(url: string, type: 'video' | 'music'): Promise<number> {
  return new Promise((resolve, reject) => {
    const media = document.createElement(type === 'video' ? 'video' : 'audio');
    const finish = (error?: string) => {
      const duration = media.duration;
      clearTimeout(timeout); media.onloadedmetadata = null; media.onerror = null;
      media.removeAttribute('src'); media.load();
      if (error || !Number.isFinite(duration) || duration <= 0) reject(new Error(error || 'Cannot read media duration.'));
      else resolve(duration * 1000);
    };
    const timeout = setTimeout(() => finish('Media metadata timed out. Try an H.264 MP4 file.'), 15000);
    media.onloadedmetadata = () => finish();
    media.onerror = () => finish('This media cannot be played. Try an H.264 MP4 or a supported audio file.');
    media.preload = 'metadata'; media.src = url;
  });
}

/** Picker and Finder drops both persist files before inserting timeline clips. */
export function useMediaImport(projectId: string) {
  const { tracks, addTrack, addKeyframe } = useStudio();
  const [importing, setImporting] = useState(false), [error, setError] = useState('');
  const importFiles = async (files: File[], timestamp = 0) => {
    if (importing) return;
    setImporting(true); setError('');
    const available = [...tracks];
    const trackFor = async (type: 'video' | 'music') => {
      let track = available.find(track => track.type === type && !track.locked);
      if (!track) {
        const data: Omit<VideoTrack, 'id'> = { projectId, type, label: type === 'video' ? 'Video Track' : 'Music Track', locked: false, order: available.length, volume: 100, muted: false };
        track = { ...data, id: await addTrack(data) }; available.push(track);
      }
      return track.id;
    };
    try {
      for (const file of files) {
        if (file.size > 32 * 1024 * 1024) throw new Error(`${file.name}: maximum import size is 32 MiB.`);
        const type = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(file.name) ? 'image' :
          file.type.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(file.name) ? 'video' :
            file.type.startsWith('audio/') || /\.(mp3|wav|flac|ogg|m4a)$/i.test(file.name) ? 'music' : null;
        if (!type) throw new Error(`${file.name}: choose an image, video or audio file.`);
        const form = new FormData(); form.append('file', file);
        const response = await fetch('/api/upload', { method: 'POST', body: form });
        const uploaded = await response.json();
        if (!response.ok || !uploaded.success || !uploaded.url) throw new Error(uploaded.error || `${file.name}: upload failed.`);
        const url = normalizeUrl(uploaded.url);
        const duration = type === 'image' ? 5000 : await mediaDuration(url, type);
        let finalUrl = url;
        // Split only when both outputs are ready; otherwise keep original video audio.
        if (type === 'video') {
          try {
            const call = async (action: string) => {
              const result = await fetch(`/api/video-tracks/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoPath: url }) });
              const value = await result.json(); if (!result.ok) throw new Error(value.error); return value;
            };
            if ((await call('detect-audio')).hasAudio) {
              const audio = await call('extract-audio'), muted = await call('create-muted');
              if (audio.audioPath && muted.mutedVideoPath) {
                await addKeyframe({ trackId: await trackFor('music'), timestamp, duration, data: { type: 'music', mediaId: crypto.randomUUID(), url: normalizeUrl(audio.audioPath), prompt: `${file.name} (audio)`, originalDuration: duration } });
                finalUrl = normalizeUrl(muted.mutedVideoPath);
              }
            }
          } catch { /* FFmpeg is optional; retain the original audio in the video. */ }
        }
        await addKeyframe({ trackId: await trackFor(type === 'music' ? 'music' : 'video'), timestamp, duration, data: { type, mediaId: crypto.randomUUID(), url: finalUrl, prompt: file.name, originalDuration: duration } });
        timestamp += duration;
      }
    } catch (error) { setError(error instanceof Error ? error.message : 'Media import failed.'); }
    finally { setImporting(false); }
  };
  return { importFiles, importing, error };
}
