import React from 'react';

/** Exact loop-and-spark artwork from the user's Base44 design reference. */
export function StudioMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Oopsie Studio" className={className}>
    <rect x=".75" y=".75" width="62.5" height="62.5" rx="15" fill="#14141E" stroke="#2D2D41" strokeWidth="1.5" />
    <path d="M44 20H27a9 9 0 0 0-9 9v9a9 9 0 0 0 9 9h17a9 9 0 0 0 9-9v-6" fill="none" stroke="#7C74FF" strokeWidth="5.5" strokeLinecap="round" />
    <path d="M46 14.5 49.2 18.8 53.5 21 49.2 23.2 46 27.5 42.8 23.2 38.5 21 42.8 18.8Z" fill="#F0A868" />
  </svg>;
}
export function StudioWordmark() {
  return <span className="studio-wordmark text-xl leading-tight">Oopsie<small>STUDIO</small></span>;
}
export type StudioIconName = 'generate' | 'workflows' | 'models' | 'endpoints' | 'jobs' | 'library' | 'settings' | 'image' | 'video' | 'audio' | 'music';
const paths: Record<StudioIconName, React.ReactNode> = {
  generate: <><path d="m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7Z" /><path d="m20 2 .6 1.4L22 4l-1.4.6L20 6l-.6-1.4L18 4l1.4-.6Z" /></>,
  workflows: <path d="M9 7H6a3 3 0 1 1 3-3v16a2 2 0 1 1-2-2h10a2 2 0 1 1-2 2V4a2 2 0 1 1 2 2H7" />,
  models: <><path d="m12 3 9 9-9 9-9-9Z" /><path d="m3 12 9 4 9-4M12 3v13" /></>,
  endpoints: <path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4" />,
  jobs: <path d="M9 5h12M9 12h12M9 19h12M3 5h1M3 12h1M3 19h1" />,
  library: <><rect x="4" y="7" width="16" height="14" rx="2" /><path d="M7 3h10M6 5h12" /></>,
  settings: <><path d="m9 3-1 3-3 1-2 4 2 2v4l4 3 3-1 3 1 4-3v-4l2-2-2-4-3-1-1-3Z" /><circle cx="12" cy="12" r="3" /></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8" cy="9" r="1.5" /><path d="m4 18 5-5 4 3 3-5 5 7" /></>,
  video: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m10 9 5 3-5 3Z" /></>,
  audio: <><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" /></>,
  music: <><path d="M9 18V5l11-2v13M9 8l11-2" /><ellipse cx="6" cy="18" rx="3" ry="2" /><ellipse cx="17" cy="16" rx="3" ry="2" /></>,
};
export function StudioIcon({ name, className = 'w-5 h-5' }: { name: StudioIconName; className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>{paths[name]}</svg>;
}
