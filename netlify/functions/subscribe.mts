/**
 * POST the full settings object (ticket 02). Overwrites are blind: the
 * subscription endpoint is the identity, so a re-send with changed settings
 * (threshold, place, toggles, gates) replaces the stored object. The
 * handler logic lives in the tested src/push/handlers module; this file is
 * the platform adapter.
 */

import type { Config, Context } from "@netlify/functions";

import { handleSubscribe } from "../../src/push/handlers";
import { subscriptionStore } from "./lib/push-store";

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return new Response(null, { status: 405 });
  }
  const body: unknown = await req.json().catch(() => null);
  const result = await handleSubscribe(body, {
    store: subscriptionStore(),
    now: Date.now(),
  });
  return new Response(null, { status: result.status });
};

export const config: Config = {};
