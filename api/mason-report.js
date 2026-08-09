import { timingSafeEqual } from "node:crypto";
import { getGtmSnapshot } from "../lib/gtm-report.js";

const MAX_SECRET_BYTES = 256;

function json(response, status, body) {
  response.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store, private");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.end(JSON.stringify(body));
}

function safeEqual(left, right) {
  const a = Buffer.from(left || "");
  const b = Buffer.from(right || "");
  return a.length === b.length && timingSafeEqual(a, b);
}

function suppliedSecret(request) {
  if (typeof request.body !== "string") return "";
  if (Buffer.byteLength(request.body, "utf8") > MAX_SECRET_BYTES) return "";
  return request.body.trim();
}

export function createMasonReportHandler({ getSnapshot = getGtmSnapshot } = {}) {
  return async function masonReportHandler(request, response) {
    if (request.method !== "POST") {
      response.setHeader("Allow", "POST");
      return json(response, 405, { ok: false, code: "method_not_allowed" });
    }

    const expected = process.env.MASON_REPORT_SECRET;
    if (!expected) return json(response, 503, { ok: false, code: "report_unconfigured" });
    if (!safeEqual(suppliedSecret(request), expected)) return json(response, 401, { ok: false, code: "unauthorized" });

    try {
      const snapshot = await getSnapshot();
      return json(response, 200, { ok: true, scope: "aggregate_only", snapshot });
    } catch (error) {
      console.error(JSON.stringify({ code: "mason_report_failed", errorName: error?.name || "Error" }));
      return json(response, 503, { ok: false, code: "report_temporarily_unavailable" });
    }
  };
}

export default createMasonReportHandler();
