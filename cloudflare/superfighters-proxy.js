const DEFAULT_ORIGIN = 'http://45-77-204-19.sslip.io:9208';

export default {
  async fetch(request, env) {
    const origin = env.ORIGIN || DEFAULT_ORIGIN;
    const url = new URL(request.url);

    if (!url.pathname.startsWith('/superfighters') && !url.pathname.startsWith('/.wrtc')) {
      return new Response('Not found', { status: 404 });
    }

    const target = new URL(url.pathname + url.search, origin);
    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.delete('cf-connecting-ip');
    headers.delete('cf-ipcountry');
    headers.delete('cf-ray');
    headers.delete('cf-visitor');
    headers.delete('x-forwarded-proto');
    headers.delete('x-real-ip');

    const proxyRequest = new Request(target, {
      method: request.method,
      headers,
      body: request.body,
      redirect: 'manual',
    });
    return fetch(proxyRequest);
  },
};
