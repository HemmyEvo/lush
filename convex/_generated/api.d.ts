/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as orders from "../orders.js";
import type * as products from "../products.js";
import type * as riders from "../riders.js";

import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";

declare const fullApi: ApiFromModules<{
  orders: typeof orders;
  products: typeof products;
  riders: typeof riders;
}>;

export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;

export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;

export declare const components: {};
