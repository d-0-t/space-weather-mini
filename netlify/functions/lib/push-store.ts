/**
 * The Blobs-backed subscription store every sender function shares
 * (ticket 02): the built-in Netlify key-value store behind the 3-method
 * seam. The cast is deliberate and lives here alone: the Blobs `Store`
 * class carries private members, so it never matches a structural
 * interface; the runtime surface the seam uses is exactly
 * get / set / delete / list.
 */

import { getStore } from "@netlify/blobs";

import {
  createBlobsSubscriptionStore,
  type BlobsKV,
  type SubscriptionStore,
} from "../../../src/push/subscription-store";

/** The Blobs store every sender function shares. */
export const subscriptionStore = (): SubscriptionStore =>
  createBlobsSubscriptionStore(
    getStore({
      name: "push-subscriptions",
      consistency: "strong",
    }) as unknown as BlobsKV,
  );
