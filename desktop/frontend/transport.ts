type Tauri = { core: { invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>; convertFileSrc(path: string): string } };
declare global { interface Window { __TAURI__?: Tauri } }
export function installNativeTransport() {
  const native = window.__TAURI__;
  if (!native) return;
  const original = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) return original(input, init);
    try {
      const request = new Request(url, init || (input instanceof Request ? input : undefined));
      let body: unknown = null;
      if (!['GET', 'HEAD'].includes(request.method)) {
        if (request.headers.get('content-type')?.includes('multipart/form-data')) {
          const form = await request.formData(), fields: Record<string, unknown> = {};
          for (const [key, value] of form.entries()) {
            if (value instanceof File) {
              if (value.size > 32 * 1024 * 1024) throw new Error('Native upload limit is 32 MiB per file');
              fields[key] = { name: value.name, type: value.type, bytes: Array.from(new Uint8Array(await value.arrayBuffer())) };
            } else fields[key] = value;
          }
          body = fields;
        } else { const text = await request.text(); body = text ? JSON.parse(text) : null; }
      }
      const result = await native.core.invoke('api', { path: url.pathname + url.search, method: request.method, body });
      return Response.json(result);
    } catch (error) {
      const message = typeof error === 'string' ? error : error instanceof Error ? error.message : 'Native operation failed';
      return Response.json({ success: false, error: message, message }, { status: 400 });
    }
  };
  // Downloads in WKWebView reveal managed originals through the native boundary.
  document.addEventListener('click', event => {
    if (event.defaultPrevented) return;
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[download]') : null;
    if (!link || !link.href.startsWith('asset:')) return;
    event.preventDefault();
    void native.core.invoke('api', { path: '/api/native/reveal', method: 'POST', body: { url: link.href } }).catch(error => console.error('Reveal failed:', error));
  });
  // Surface renderer failures in the app instead of leaving an empty window.
  window.addEventListener('error', event => { console.error('Renderer:', event.message); });
}
