import assert from "node:assert/strict";
import test from "node:test";
import { serverFetch } from "../app/common/utils/server-fetch.mjs";

for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
  test(`${method} sends JSON explicitly with auth and query parameters`, async t => {
    const input = new Request("https://api.example.test/profile?draft=true", {
      method,
      headers: { "Content-Type": "application/json", Authorization: "Bearer test-token" },
      body: JSON.stringify({ first_name: "Updated", complete: true }),
      cache: "no-store",
    });
    t.mock.method(globalThis, "fetch", async (url, init) => {
      // This is deliberately a URL plus init, not fetch(Request). Next's
      // production wrapper must receive the body as an explicit init value.
      assert.equal(url, input.url);
      assert.equal(init.method, method);
      assert.equal(init.headers.get("Authorization"), "Bearer test-token");
      assert.equal(init.cache, "no-store");
      assert.deepEqual(JSON.parse(new TextDecoder().decode(init.body)), {
        first_name: "Updated", complete: true,
      });
      return new Response("{}", { status: 200 });
    });
    assert.equal((await serverFetch(input)).status, 200);
  });
}

test("multipart fields, filenames and binary contents survive intact", async t => {
  const form = new FormData();
  form.set("title", "Resume");
  form.set("attachment", new Blob([new Uint8Array([0, 255, 10, 42])]), "resume.pdf");
  const input = new Request("https://api.example.test/uploads", { method: "POST", body: form });
  t.mock.method(globalThis, "fetch", async (url, init) => {
    const received = await new Request(url, init).formData();
    assert.equal(received.get("title"), "Resume");
    const file = received.get("attachment");
    assert.equal(file.name, "resume.pdf");
    assert.deepEqual(new Uint8Array(await file.arrayBuffer()), new Uint8Array([0, 255, 10, 42]));
    return new Response(null, { status: 201 });
  });
  assert.equal((await serverFetch(input)).status, 201);
});

test("GET/HEAD remain bodyless and preserve Next cache options", async t => {
  for (const method of ["GET", "HEAD"]) {
    t.mock.method(globalThis, "fetch", async (_url, init) => {
      assert.equal(init.method, method);
      assert.equal(init.body, undefined);
      assert.deepEqual(init.next, { tags: ["profile"] });
      return new Response(null, { status: 200 });
    });
    await serverFetch("https://api.example.test/profile", { method, next: { tags: ["profile"] } });
  }
});

test("HTTP failures reach Ky unchanged", async t => {
  t.mock.method(globalThis, "fetch", async () => {
    return new Response('{"detail":"Forbidden"}', { status: 403 });
  });
  const response = await serverFetch("https://api.example.test/profile");
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { detail: "Forbidden" });
});

test("cancellation reaches fetch without being swallowed", async t => {
  const abort = new AbortController();
  abort.abort(new DOMException("Cancelled", "AbortError"));
  t.mock.method(globalThis, "fetch", async (_url, init) => {
    assert.equal(init.signal.aborted, true);
    throw init.signal.reason;
  });
  await assert.rejects(
    serverFetch("https://api.example.test/profile", { signal: abort.signal }),
    error => error === abort.signal.reason,
  );
});
