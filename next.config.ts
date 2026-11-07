import type { NextConfig } from 'next';
const config: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: '10mb' }, cpus: 2 },
  serverExternalPackages: ['@remotion/bundler', '@remotion/renderer'],
  logging: { fetches: { fullUrl: false } },
};
export default config;
