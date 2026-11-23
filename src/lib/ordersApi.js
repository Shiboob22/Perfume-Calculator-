// The order queue's calls to /api/batches?resource=orders (api/batches.ts).
import { authHeaders, apiError } from "./fragranceApi";

const URL = "/api/batches?resource=orders";

async function call(method, body) {
  const res = await fetch(URL, { method, headers: await authHeaders(), body: body === undefined ? undefined : JSON.stringify(body) });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export const listOrders = async () => (await call("GET")).orders || [];
/** `order` may carry a client id, so a retried add never makes two. */
export const addOrder = async (order) => (await call("POST", order)).order;
export const editOrder = async (id, edit) => (await call("PATCH", { id, edit })).order;
export const setOrderStatus = async (id, status) => (await call("PATCH", { id, status })).order;
export const setGroupMode = async (ids, groupMode) => (await call("PATCH", { ids, group_mode: groupMode })).orders || [];
