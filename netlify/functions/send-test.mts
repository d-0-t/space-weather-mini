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
  const endpoint = new URL(req.url).searchParams.get("endpoint") ?? "";
  const vapid = {
    subject: process.env.VAPID_CONTACT ?? "",
    publicKey: process.env.VAPID_PUBLIC_KEY ?? "",
    privateKey: process.env.VAPID_PRIVATE_KEY ?? "",
  };
  if (!vapid.subject || !vapid.publicKey || !vapid.privateKey) {
    return new Response(null, { status: 503 });
  }
  const result = await handleSendTest(endpoint, {
    store: subscriptionStore(),
    send: createWebPushSender(vapid),
  });
  return new Response(null, { status: result.status });
};

export const config: Config = {};
