function configured(name) {
  return Boolean(String(process.env[name] || "").trim());
}

export default function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ ok: false, code: "method_not_allowed" });
  }
  const dependencies = {
    hubspot: configured("HUBSPOT_ACCESS_TOKEN"),
    gtmWebhook: configured("GTM_WEBHOOK_URL"),
    turnstile: configured("TURNSTILE_SITE_KEY") && configured("TURNSTILE_SECRET_KEY")
  };
  const ready = Object.values(dependencies).every(Boolean);
  response.setHeader("Cache-Control", "no-store");
  return response.status(ready ? 200 : 503).json({
    service: "swell-marketing",
    status: ready ? "ready" : "degraded",
    dependencies
  });
}
