const hub = "https://huggingface.co";
const translationRepo = "midudev/firefox-translations";
const translationRevision = "6f6acd72c26975a06a8e61b72d1fbacbd184c23f";
const translationFiles = `/${translationRepo}/resolve/${translationRevision}/`;
const translationCatalog = `/api/models/${translationRepo}/tree/${translationRevision}/`;
const draft = "qwen2.5-coder-0.5b-instruct-q4_k_m.gguf";
const draftSize = 491_400_064;
const draftURL = `${hub}/Qwen/Qwen2.5-Coder-0.5B-Instruct-GGUF/resolve/ebb2015119c907b064c512bf053e945850b5875f/${draft}`;
const compat = "https://cdn.jsdelivr.net/npm/@wllama/wllama-compat@3.13.0/wasm/";
const pair = /^[a-z]{2,3}(?:-[A-Z][a-z]{3})?-[a-z]{2,3}(?:-[A-Z][a-z]{3})?$/;
const translationFile = /^(?:model|lex|vocab|srcvocab|trgvocab)\.[\w.-]+\.(?:bin|spm)$/;
const jsonType = "application/json";
const binaryType = "application/octet-stream";

function source(path) {
  if (path === `/${draft}`) return [draftURL, binaryType, draftSize];
  if (path === "/runtime/wllama.js") return [`${compat}wllama.js`, "text/javascript"];
  if (path === "/runtime/wllama.wasm") return [`${compat}wllama.wasm`, "application/wasm"];
  if (path === `${translationFiles}index.json`) return [`${hub}${path}`, jsonType];
  if (path.startsWith(translationCatalog) && pair.test(path.slice(translationCatalog.length))) {
    return [`${hub}${path}`, jsonType];
  }
  if (path.startsWith(translationFiles)) {
    const parts = path.slice(translationFiles.length).split("/");
    if (parts.length === 2 && pair.test(parts[0]) &&
        translationFile.test(parts[1]) && !parts[1].includes("..")) {
      return [`${hub}${path}`, binaryType];
    }
  }
  return null;
}

export default {
  async fetch(request, _env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const target = path.startsWith("/_models/") ? source(path.slice("/_models".length)) : null;
    if (!target || url.search) return new Response("Not found", { status: 404 });
    const { method } = request;
    if (method !== "GET" && method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    const [upstreamURL, type, size] = target;
    let upstream;
    try {
      upstream = await fetch(upstreamURL, {
        method,
        redirect: "follow",
        headers: { "Accept-Encoding": "identity" },
      });
    } catch {
      return new Response("Model download service unavailable", { status: 502 });
    }
    if (upstream.status !== 200 || (method === "GET" && !upstream.body)) {
      await upstream.body?.cancel().catch(() => {});
      return new Response("Model file unavailable", { status: upstream.status === 404 ? 404 : 502 });
    }
    const headers = new Headers({
      "Content-Type": type,
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    });
    if (size && upstream.headers.get("Content-Length") !== String(size)) {
      await upstream.body?.cancel().catch(() => {});
      return new Response("Unexpected model file size", { status: 502 });
    }
    if (method === "HEAD") {
      const length = upstream.headers.get("Content-Length");
      if (length !== null) headers.set("Content-Length", length);
      return new Response(null, { headers });
    }
    if (size) {
      const stream = new FixedLengthStream(size);
      ctx.waitUntil(upstream.body.pipeTo(stream.writable).catch(() => {}));
      return new Response(stream.readable, { headers });
    }
    return new Response(upstream.body, { headers });
  },
};
