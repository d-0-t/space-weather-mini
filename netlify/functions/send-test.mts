/**
 * Fires one canned test poke end to end (ticket 02) — the manual real-phone
 * check the maintainer runs after enabling background alerts. The VAPID
 * credentials come from env vars set once in the Netlify dashboard; the
 * private key is never committed.
 */

import type { Config, Context } from "@netlify/functions";

import { handleSendTest } from "../../src/push/handlers";
import { subscriptionStore } from "./lib/push-store";
import { createWebPushSender } from "../../src/push/web-push-sender";

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return new Response(null, { status: 405 });
  }
  const params = new URL(req.url).searchParams;
  const endpoint = params.get("endpoint") ?? "";
  // Optional hold so the chaser can close the app before the poke fires.
  const delaySeconds = Math.min(
    Math.max(Number(params.get("delaySeconds") ?? "0") || 0, 0),
    25,
  );
  const vapid = {
    subject: process.env.VAPID_CONTACT ?? "",
    publicKey: process.env.VAPID_PUBLIC_KEY ?? "",
    privateKey: process.env.VAPID_PRIVATE_KEY ?? "",
  };
  if (!vapid.subject || !vapid.publicKey || !vapid.privateKey) {
    return new Response(null, { status: 503 });
  }
  const result = await handleSendTest(
    endpoint,
    {
      store: subscriptionStore(),
      send: createWebPushSender(vapid),
    },
    { delayMs: delaySeconds * 1000 },
  );
  // Outcome only (no addresses): enough to tell found/sent/gone apart in
  // the function logs without storing anything identifiable.
  console.log(
    `[send-test] status=${result.status} delaySeconds=${delaySeconds} found=${result.status !== 404}`,
  );
  return new Response(null, { status: result.status });
};

export const config: Config = {};
