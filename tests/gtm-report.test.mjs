import assert from "node:assert/strict";
import test from "node:test";

import { getGtmSnapshot } from "../lib/gtm-report.js";

function response(results) {
  return { ok: true, json: async () => ({ results }) };
}

test("GTM snapshot uses HubSpot closed flags with custom pipeline stage IDs", async () => {
  const fetchImpl = async (url) => {
    const pathname = new URL(url).pathname;
    if (pathname.endsWith("/contacts")) return response([]);
    if (pathname.endsWith("/tasks")) return response([]);
    if (pathname.endsWith("/deals")) return response([
      {
        id: "won-1",
        properties: {
          dealstage: "opaque-custom-won-stage-id",
          amount: "2500",
          hs_is_closed: "true",
          hs_is_closed_won: "true",
          swell_fit: "qualified"
        }
      },
      {
        id: "lost-1",
        properties: {
          dealstage: "opaque-custom-lost-stage-id",
          amount: "3500",
          hs_is_closed: "true",
          hs_is_closed_won: "false",
          swell_fit: "qualified"
        }
      },
      {
        id: "open-1",
        properties: {
          dealstage: "opaque-custom-qualified-stage-id",
          amount: "1500",
          hs_is_closed: "false",
          hs_is_closed_won: "false",
          swell_fit: "qualified",
          swell_next_action: "Run discovery",
          swell_next_action_at: "2026-08-20T00:00:00.000Z"
        }
      }
    ]);
    throw new Error(`Unexpected HubSpot request: ${url}`);
  };

  const snapshot = await getGtmSnapshot({
    accessToken: "test-token",
    fetchImpl,
    now: new Date("2026-08-19T12:00:00.000Z")
  });

  assert.equal(snapshot.pipeline.closedWonCount, 1);
  assert.equal(snapshot.pipeline.closedWonRevenue, 2500);
  assert.equal(snapshot.pipeline.openAmount, 1500);
  assert.equal(snapshot.pipeline.openWithoutNextAction, 0);
});

test("GTM snapshot reports verified meeting and proposal milestones without contact details", async () => {
  const fetchImpl = async (url) => {
    const pathname = new URL(url).pathname;
    if (pathname.endsWith("/contacts")) return response([
      { id: "contact-1", properties: { swell_last_event_ids: "meeting-1;proposal-1", swell_meeting_booked_at: "2026-08-18T10:00:00Z", swell_meeting_held_at: "2026-08-19T10:00:00Z", swell_proposal_sent_at: "2026-08-19T12:00:00Z" } },
      { id: "contact-2", properties: { swell_last_event_ids: "meeting-2", swell_meeting_booked_at: "2026-08-18T11:00:00Z", swell_meeting_no_show_at: "2026-08-19T11:00:00Z" } }
    ]);
    if (pathname.endsWith("/deals") || pathname.endsWith("/tasks")) return response([]);
    throw new Error(`Unexpected HubSpot request: ${url}`);
  };

  const snapshot = await getGtmSnapshot({ accessToken: "test-token", fetchImpl, now: new Date("2026-08-19T13:00:00Z") });
  assert.deepEqual(snapshot.funnel, { meetingsBooked: 2, meetingsHeld: 1, meetingNoShows: 1, proposalsSent: 1, proposalsAccepted: 0 });
  assert.equal(JSON.stringify(snapshot).includes("contact-1"), false);
});
