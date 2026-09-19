/**
 * The scheduled NOAA poll (tickets 02-05): runs every few minutes on the
 * published deploy, reads the observed planetary K-index and the Kp
 * forecast plus the two L1 legs (real-time solar wind and magnetic field)
 * — the same products the app already parses — and fans out the Kp alert's
 * pokes, the Daily outlook's once-per-place-local-day poke and the Live
 * alert's shared-word pokes per stored subscription. The VAPID credentials
 * come from the Netlify dashboard's env vars.
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
import {
  RTSW_WIND_URL,
  parseRtswWind,
  RTSW_MAG_FIELD_URL,
  parseRtswMagField,
} from "../../src/products/solar-wind";
import { fetchWeather } from "../../src/data/weather";

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
        wind: await fetchLeg(RTSW_WIND_URL, parseRtswWind),
        mag: await fetchLeg(RTSW_MAG_FIELD_URL, parseRtswMagField),
      }),
      // The Live alert's per-place weather: the same Open-Meteo contract
      // the Local conditions card maps, read for each live-enabled chaser
      // at their own stored place.
      fetchWeather: async (place) => {
        const weather = await fetchWeather(place.latitude, place.longitude);
        return {
          cloudCoverPercent: weather.current.cloudCoverPercent,
          precipitationMm: weather.current.precipitationMm,
        };
      },
    });
    console.log(
      `[poll-alerts] subscriptions=${summary.subscriptions} observed=${summary.feeds.observed.length} forecast=${summary.feeds.forecast.length} wind=${summary.feeds.wind.length} mag=${summary.feeds.mag.length} sent=${summary.sent}`,
    );
    // The scheduled runtime ignores the response; the shape satisfies the
    // platform's Handler type without inventing semantics.
    return { statusCode: 200 };
  },
);
