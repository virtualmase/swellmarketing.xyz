import assert from "node:assert/strict";
import test from "node:test";

import { inferSource, inquiryOriginDetail, isAureOriginated } from "../api/leads.js";

test("AURE-tagged contact links are normalized as AURE-originated", () => {
  const request = {
    utmSource: "aure",
    utmCampaign: "aure_method",
    utmContent: "hero_cta"
  };

  assert.equal(isAureOriginated(request), true);
  assert.equal(inferSource(request), "aure");
  assert.equal(inquiryOriginDetail(request, true), "campaign=aure_method | content=hero_cta");
});

test("AURE referrers remain attributable when campaign parameters are unavailable", () => {
  const request = { referrer: "https://aure.swellmarketing.xyz/omny-audit" };

  assert.equal(isAureOriginated(request), true);
  assert.equal(inferSource(request), "aure");
  assert.match(inquiryOriginDetail(request, true), /referrer=aure\.swellmarketing\.xyz/);
});

test("non-AURE leads retain their established source classification", () => {
  const request = { utmSource: "linkedin", utmMedium: "social" };

  assert.equal(isAureOriginated(request), false);
  assert.equal(inferSource(request), "linkedin");
  assert.equal(inquiryOriginDetail(request, false), "");
});
