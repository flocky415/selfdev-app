/*
 * SelfDev — проксі для чату Джарвіза (Cloudflare Worker, безкоштовний план)
 * © 2026 Roman Chelyk. Усі права захищено. / All rights reserved.
 *
 * Навіщо: ключ Gemini лежить тут, на сервері Cloudflare, і НЕ потрапляє в браузер.
 * Безкоштовно: Cloudflare Workers — 100 000 запитів на день, Gemini API — безкоштовний рівень.
 *
 * Налаштування (Cloudflare Dashboard → Workers & Pages → твій worker → Settings → Variables):
 *   GEMINI_API_KEY   — секрет (Encrypt), ключ з Google AI Studio
 *   ALLOWED_ORIGINS  — адреси сайту через кому, напр. "https://нік.github.io,http://localhost:5173"
 *   GEMINI_MODEL     — (необов'язково) назва моделі, за замовчуванням нижче
 */

const DEFAULT_MODEL = "gemini-3.6-flash";
const MAX_BODY_BYTES = 48 * 1024;
const MAX_CONTENTS = 30;

// Простий ліміт на IP у пам'яті одного екземпляра (захист від випадкового спаму, не 100% гарантія)
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 20;
const hits = new Map();

function rateLimited(ip){

  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);

  list.push(now);
  hits.set(ip, list);

  if(hits.size > 5000) hits.clear();

  return list.length > RATE_MAX;

}

function corsHeaders(origin, env){

  const allowed = String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  const ok = origin && allowed.includes(origin);

  return {
    ok,
    headers: {
      "Access-Control-Allow-Origin": ok ? origin : "null",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin"
    }
  };

}

function json(status, data, headers){

  return new Response(JSON.stringify(data), {
    status,
    headers: Object.assign({ "Content-Type": "application/json; charset=utf-8" }, headers)
  });

}

function cleanContents(contents){

  if(!Array.isArray(contents)) return null;

  const out = contents.slice(-MAX_CONTENTS).map(c => {

    const role = c && c.role === "model" ? "model" : "user";
    const text = c && Array.isArray(c.parts) && c.parts[0] && typeof c.parts[0].text === "string"
      ? c.parts[0].text.slice(0, 4000)
      : "";

    return { role, parts: [{ text }] };

  }).filter(c => c.parts[0].text.trim() !== "");

  return out.length ? out : null;

}

export default {

  async fetch(request, env){

    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env);

    if(request.method === "OPTIONS"){

      return new Response(null, { status: cors.ok ? 204 : 403, headers: cors.headers });

    }

    if(request.method !== "POST") return json(405, { error: { code: 405, message: "Method not allowed" } }, cors.headers);

    if(!cors.ok) return json(403, { error: { code: 403, message: "Origin not allowed" } }, cors.headers);

    if(!env.GEMINI_API_KEY) return json(500, { error: { code: 500, message: "GEMINI_API_KEY is not set" } }, cors.headers);

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";

    if(rateLimited(ip)){

      return json(429, { error: { code: 429, status: "RESOURCE_EXHAUSTED", message: "Too many requests, retry in 30s" } }, cors.headers);

    }

    const raw = await request.text();

    if(raw.length > MAX_BODY_BYTES) return json(413, { error: { code: 413, message: "Request too large" } }, cors.headers);

    let body;

    try{ body = JSON.parse(raw); }catch(e){ body = null; }

    const contents = body && cleanContents(body.contents);

    if(!contents) return json(400, { error: { code: 400, message: "Bad request" } }, cors.headers);

    const system = body.system_instruction && Array.isArray(body.system_instruction.parts)
      && body.system_instruction.parts[0] && typeof body.system_instruction.parts[0].text === "string"
      ? body.system_instruction.parts[0].text.slice(0, 8000)
      : "";

    const model = /^[\w.\-]+$/.test(env.GEMINI_MODEL || "") ? env.GEMINI_MODEL : DEFAULT_MODEL;

    const upstream = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
        body: JSON.stringify({
          system_instruction: system ? { parts: [{ text: system }] } : undefined,
          contents,
          generationConfig: { temperature: 0.8, maxOutputTokens: 1024 }
        })
      }
    );

    const text = await upstream.text();

    return new Response(text, {
      status: upstream.status,
      headers: Object.assign({ "Content-Type": "application/json; charset=utf-8" }, cors.headers)
    });

  }

};
