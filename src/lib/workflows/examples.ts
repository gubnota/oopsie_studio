import type { Workflow } from './manifest';

export const workflowExamples: { id: string; name: string; description: string; document: Workflow }[] = [
  {
    id: 'cpu-image', name: 'First pixel', description: '32 × 32 image · CPU · no models',
    document: { schemaVersion: 1, graph: {
      '1': { class_type: 'EmptyImage', inputs: { width: 32, height: 32, batch_size: 1, color: 5719531 } },
      '2': { class_type: 'SaveImage', inputs: { images: ['1', 0], filename_prefix: 'oopsie_cpu' } },
    }, bindings: [] },
  },
  {
    id: 'cpu-video', name: 'First frames', description: '32 × 32 video · 1 second · CPU · no models',
    document: { schemaVersion: 1, graph: {
      '1': { class_type: 'EmptyImage', inputs: { width: 32, height: 32, batch_size: 12, color: 5719531 } },
      '2': { class_type: 'SaveWEBM', inputs: { images: ['1', 0], filename_prefix: 'oopsie_cpu', codec: 'vp9', fps: 12, crf: 32 } },
    }, bindings: [] },
  },
];
