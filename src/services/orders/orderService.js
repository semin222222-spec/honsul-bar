import { hasStoreScope } from "../../shared/lib/storeScope.js";

const MAX_ORDER_QUANTITY = 10;

function normalizePrice(price) {
  const parsed = Number.parseInt(price, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeNullableText(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function currentDate() {
  return new Date();
}

export function normalizeOrderQuantity(quantity) {
  const parsed = Number.parseInt(quantity, 10);
  const safeQuantity = Number.isFinite(parsed) ? parsed : 1;
  return Math.max(1, Math.min(MAX_ORDER_QUANTITY, safeQuantity));
}

export function getOrdersTotal(orders) {
  return (orders || []).reduce((sum, order) => {
    return sum + normalizePrice(order?.price);
  }, 0);
}

export function buildCustomerOrderRows({
  storeId,
  sessionId,
  seatLabel,
  menuName,
  menuIcon,
  price,
  optionId,
  optionName,
  quantity = 1,
}) {
  const qty = normalizeOrderQuantity(quantity);
  const baseOrder = {
    store_id: storeId,
    session_id: sessionId,
    seat_label: seatLabel,
    menu_name: menuName,
    menu_icon: menuIcon,
    price: normalizePrice(price),
    status: "pending",
  };

  if (optionId) baseOrder.option_id = optionId;
  if (optionName) baseOrder.option_name = optionName;

  return Array.from({ length: qty }, () => ({ ...baseOrder }));
}

export async function createCustomerOrder(input, deps) {
  const { repository, now = currentDate } = deps;
  const { storeId, sessionId, seatLabel } = input;

  if (!sessionId || !seatLabel || !hasStoreScope(storeId)) return null;

  const quantity = normalizeOrderQuantity(input.quantity);
  const unitPrice = normalizePrice(input.price);
  const rows = buildCustomerOrderRows(input);
  const orders = await repository.insertOrders(rows);

  await repository.touchSession({
    storeId,
    sessionId,
    touchedAt: now().toISOString(),
  });

  return {
    orders,
    quantity,
    totalPrice: unitPrice * quantity,
  };
}

export function buildManualOrderRows({
  storeId,
  session,
  menu,
  option,
  quantity = 1,
  memo,
  unitPrice,
}) {
  const qty = normalizeOrderQuantity(quantity);
  const baseOrder = {
    store_id: storeId,
    session_id: session.id,
    seat_label: session.seat_label,
    menu_name: menu.name,
    menu_icon: menu.icon || "🍸",
    option_name: option?.name || null,
    price: normalizePrice(unitPrice),
    status: "pending",
    memo: normalizeNullableText(memo),
    is_manual: true,
  };

  if (option?.id) baseOrder.option_id = option.id;

  return Array.from({ length: qty }, () => ({ ...baseOrder }));
}

export async function createManualOrder(input, deps) {
  const { repository, now = currentDate } = deps;
  const storeId = input.storeId || input.session?.store_id;

  if (!hasStoreScope(storeId) || !input.session?.id || !input.menu?.name) {
    return null;
  }

  const quantity = normalizeOrderQuantity(input.quantity);
  const unitPrice = normalizePrice(input.unitPrice);
  const rows = buildManualOrderRows({ ...input, storeId });
  const orders = await repository.insertOrders(rows);

  await repository.touchSession({
    storeId,
    sessionId: input.session.id,
    touchedAt: now().toISOString(),
  });

  return {
    orders,
    quantity,
    totalPrice: unitPrice * quantity,
  };
}

export function createServedOrderPatch(now = currentDate) {
  return {
    status: "served",
    served_at: now().toISOString(),
  };
}

export async function markOrderServed({ storeId, orderId, servedAt }, deps) {
  if (!orderId || !hasStoreScope(storeId)) return false;

  await deps.repository.markOrderServed({ storeId, orderId, servedAt });
  return true;
}

export async function cancelOrder({ storeId, orderId }, deps) {
  if (!orderId || !hasStoreScope(storeId)) return false;

  await deps.repository.deleteOrder({ storeId, orderId });
  return true;
}
