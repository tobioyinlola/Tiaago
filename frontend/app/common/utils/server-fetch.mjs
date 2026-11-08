/**
 * Pass Request properties explicitly to Next's fetch wrapper. In production,
 * a body carried only by a Request object can arrive at Django as an empty
 * request. Buffering the body also preserves multipart boundaries and files.
 *
 * @type {typeof fetch}
 */
export const serverFetch = async (input, init) => {
  const request = new Request(input, init);
  const body = request.body === null ? undefined : await request.arrayBuffer();

  return fetch(request.url, {
    ...init,
    method: request.method,
    headers: request.headers,
    body,
    cache: request.cache,
    credentials: request.credentials,
    redirect: request.redirect,
    referrer: request.referrer,
    referrerPolicy: request.referrerPolicy,
    integrity: request.integrity,
    keepalive: request.keepalive,
    mode: request.mode,
    signal: request.signal,
  });
};
