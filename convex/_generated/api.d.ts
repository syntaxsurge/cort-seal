/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analyses from "../analyses.js";
import type * as crons from "../crons.js";
import type * as directory from "../directory.js";
import type * as lib_monitorsShared from "../lib/monitorsShared.js";
import type * as monitors from "../monitors.js";
import type * as monitorsActions from "../monitorsActions.js";
import type * as proofs from "../proofs.js";
import type * as rateLimit from "../rateLimit.js";
import type * as seals from "../seals.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  analyses: typeof analyses;
  crons: typeof crons;
  directory: typeof directory;
  "lib/monitorsShared": typeof lib_monitorsShared;
  monitors: typeof monitors;
  monitorsActions: typeof monitorsActions;
  proofs: typeof proofs;
  rateLimit: typeof rateLimit;
  seals: typeof seals;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
