/**
 * The scheduled NOAA poll (ticket 02): runs every few minutes on the
 * published deploy, polls the three NOAA products the app already reads and
 * iterates the stored subscriptions. The matching, dedupe and fan-out per
 * alert type land in tickets 03-05; until then the poll sends nothing.
 * The VAPID credentials come from the Netlify dashboard's env vars.
 */

import {
  schedule,
  type HandlerEvent,
} from "@netlify/functions";

import { runPoll } from "../../src/push/handlers";
import { subscriptionStore } from "./lib/push-store";
import { createWebPushSender } from "../../src/push/web-push-sender";
import {
  ALERTS_URL,
  parseAlerts,
} from "../../src/products/alerts";
import {
  NOAA_PLANETARY_K_INDEX_FORECAST_URL,
  parsePlanetaryKIndexForecast,
} from "../../src/products/noaa-planetary-k-index";
import {
  NOAA_SCALES_URL,
  parseNoaaScales,
} from "../../src/products/noaa-scales";

/** Polls one NOAA product and counts its parsed entries; failures surface. */
async function fetchLeg(
  url: string,
  parse: (text: string) => unknown,
): Promise<number> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`The NOAA poll could not read ${url} (${response.status})`);
  }
  const parsed = parse(await response.text());
  return Array.isArray(parsed) ? parsed.length : 1;
}

export default schedule(
  "*/5 * * * *",
  async (_event: HandlerEvent) => {
    const vapid = {
      subject: process.env.VAPID_CONTACT ?? "",
      publicKey: process.env.VAPID_PUBLIC_KEY ?? "",
      privateKey: process.env.VAPID_PRIVATE_KEY ?? "",
    };
    const summary = await runPoll({
      store: subscriptionStore(),
      // The fan-out boundary: tickets 03-05 call the sender from here.
      send: createWebPushSender(vapid),
      fetchFeeds: async () => ({
        alerts: await fetchLeg(ALERTS_URL, parseAlerts),
        forecast: await fetchLeg(
          NOAA_PLANETARY_K_INDEX_FORECAST_URL,
          parsePlanetaryKIndexForecast,
        ),
        scales: await fetchLeg(NOAA_SCALES_URL, parseNoaaScales),
      }),
    });
    console.log(
      `[poll-alerts] subscriptions=${summary.subscriptions} alerts=${summary.feeds.alerts} forecast=${summary.feeds.forecast} scales=${summary.feeds.scales} sent=${summary.sent}`,
    );
    // The scheduled runtime ignores the response; the shape satisfies the
    // platform's Handler type without inventing semantics.
    return { statusCode: 200 };
  },
);
