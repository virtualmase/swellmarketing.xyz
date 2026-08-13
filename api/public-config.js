function json(response, status, body) {
  response.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.end(JSON.stringify(body));
}

export default function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return json(response, 405, { ok: false, code: "method_not_allowed" });
  }

  return json(response, 200, {
    ok: true,
    turnstileSiteKey: String(process.env.TURNSTILE_SITE_KEY || "").trim()
  });
}
