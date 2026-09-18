/**
 * DELETE the chaser's subscription entirely (ticket 02): the disable path.
 * The endpoint rides the query string because disable carries no body.
 */

import type { Config, Context } from "@netlify/functions";

import { handleUnsubscribe } from "../../src/push/handlers";
import { subscriptionStore } from "./lib/push-store";

export default async (req: Request, _context: Context) => {
  if (req.method !== "DELETE") {
    return new Response(null, { status: 405 });
  }
  const endpoint = new URL(req.url).searchParams.get("endpoint") ?? "";
  const result = await handleUnsubscribe(endpoint, {
    store: subscriptionStore(),
  });
  return new Response(null, { status: result.status });
};

export const config: Config = {};
