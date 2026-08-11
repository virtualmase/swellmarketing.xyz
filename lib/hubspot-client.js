const API_ROOT = "https://api.hubapi.com";
const CRM_VERSION = "2026-03";

export class HubSpotError extends Error {
  constructor(message, { status, body, retryable = false } = {}) {
    super(message);
    this.name = "HubSpotError";
    this.status = status;
    this.body = body;
    this.retryable = retryable;
  }
}

export class HubSpotClient {
  constructor({ accessToken, fetchImpl = globalThis.fetch }) {
    if (!accessToken) throw new Error("HUBSPOT_ACCESS_TOKEN is required.");
    this.accessToken = accessToken;
    this.fetchImpl = fetchImpl;
  }

  async request(pathname, { method = "GET", body, allow404 = false } = {}) {
    const response = await this.fetchImpl(`${API_ROOT}${pathname}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        "User-Agent": "Swell-GTM/1.0"
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(10_000)
    });
    if (allow404 && response.status === 404) return null;
    const text = await response.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = { raw: text.slice(0, 1000) }; }
    if (!response.ok) {
      throw new HubSpotError(`HubSpot request failed with ${response.status}.`, {
        status: response.status,
        body: payload,
        retryable: response.status === 429 || response.status >= 500
      });
    }
    return payload;
  }

  getContactByEmail(email) {
    const properties = ["email", "firstname", "lastname", "phone", "company", "website", "swell_last_event_ids", "swell_do_not_contact"].join(",");
    return this.request(`/crm/objects/${CRM_VERSION}/contacts/${encodeURIComponent(email)}?idProperty=email&properties=${properties}&associations=companies`, { allow404: true });
  }

  searchContactByPhone(phone) {
    return this.request(`/crm/objects/${CRM_VERSION}/contacts/search`, {
      method: "POST",
      body: { filterGroups: [{ filters: [{ propertyName: "phone", operator: "EQ", value: phone }] }], limit: 1, properties: ["phone", "swell_last_event_ids", "swell_do_not_contact"] }
    }).then((result) => result?.results?.[0] || null);
  }

  createContact(properties) {
    return this.request(`/crm/objects/${CRM_VERSION}/contacts`, { method: "POST", body: { properties } });
  }

  updateContact(id, properties) {
    return this.request(`/crm/objects/${CRM_VERSION}/contacts/${id}`, { method: "PATCH", body: { properties } });
  }

  getCompanyByDomain(domain) {
    return this.request(`/crm/objects/${CRM_VERSION}/companies/search`, {
      method: "POST",
      body: {
        filterGroups: [{ filters: [{ propertyName: "domain", operator: "EQ", value: domain }] }],
        limit: 1,
        properties: ["name", "domain", "website"]
      }
    }).then((result) => result?.results?.[0] || null);
  }

  createCompany(properties) {
    return this.request(`/crm/objects/${CRM_VERSION}/companies`, { method: "POST", body: { properties } });
  }

  getCompanyById(id) {
    return this.request(`/crm/objects/${CRM_VERSION}/companies/${id}?properties=name,domain,website`, { allow404: true });
  }

  updateCompany(id, properties) {
    return this.request(`/crm/objects/${CRM_VERSION}/companies/${id}`, { method: "PATCH", body: { properties } });
  }

  createDeal(properties) {
    return this.request(`/crm/objects/${CRM_VERSION}/deals`, { method: "POST", body: { properties } });
  }

  getDealByEventId(eventId) {
    return this.request(`/crm/objects/${CRM_VERSION}/deals/${encodeURIComponent(eventId)}?idProperty=swell_event_id&properties=dealname,swell_event_id`, { allow404: true });
  }

  createNote(properties) {
    return this.request(`/crm/objects/${CRM_VERSION}/notes`, { method: "POST", body: { properties } });
  }

  createTask(properties) {
    return this.request(`/crm/objects/${CRM_VERSION}/tasks`, { method: "POST", body: { properties } });
  }

  associate(fromType, fromId, toType, toId) {
    return this.request(`/crm/v4/objects/${fromType}/${fromId}/associations/default/${toType}/${toId}`, { method: "PUT" });
  }
}

export function splitName(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return { firstname: parts.shift() || "", lastname: parts.join(" ") };
}

export function domainFromWebsite(value) {
  if (!value) return "";
  try { return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).hostname.replace(/^www\./, "").toLowerCase(); }
  catch { return ""; }
}

export function appendEventId(existing, eventId) {
  const values = String(existing || "").split(";").filter(Boolean).filter((value) => value !== eventId);
  return [...values.slice(-49), eventId].join(";");
}
