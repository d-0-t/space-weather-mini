/**
 * The scheduled NOAA poll (tickets 02-03): runs every few minutes on the
 * published deploy, reads the observed planetary K-index and the Kp
 * forecast (the same products the app already parses) and fans out the Kp
 * alert's pokes per stored subscription. Tickets 04-05 add the daily
 * outlook and live alert legs. The VAPID credentials come from the Netlify
 * dashboard's env vars.
 */

import {
  schedule,
  type HandlerEvent,
} from "@netlify/functions";

import { runPoll } from "../../src/push/handlers";
import { subscriptionStore } from "./lib/push-store";
import { createWebPushSender } from "../../src/push/web-push-sender";
import {
  NOAA_PLANETARY_K_INDEX_URL,
  parsePlanetaryKIndex,
  NOAA_PLANETARY_K_INDEX_FORECAST_URL,
  parsePlanetaryKIndexForecast,
} from "../../src/products/noaa-planetary-k-index";

/** Polls one NOAA product and parses it; failures surface to the caller. */
async function fetchLeg<T>(
  url: string,
  parse: (text: string) => T,
): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`The NOAA poll could not read ${url} (${response.status})`);
  }
  return parse(await response.text());
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
      // The send call boundary: the tested fan-out calls the sender here.
      send: createWebPushSender(vapid),
      fetchFeeds: async () => ({
        observed: await fetchLeg(
          NOAA_PLANETARY_K_INDEX_URL,
          parsePlanetaryKIndex,
        ),
        forecast: await fetchLeg(
          NOAA_PLANETARY_K_INDEX_FORECAST_URL,
          parsePlanetaryKIndexForecast,
        ),
      }),
    });
    console.log(
      `[poll-alerts] subscriptions=${summary.subscriptions} observed=${summary.feeds.observed.length} forecast=${summary.feeds.forecast.length} sent=${summary.sent}`,
    );
    // The scheduled runtime ignores the response; the shape satisfies the
    // platform's Handler type without inventing semantics.
    return { statusCode: 200 };
  },
);
