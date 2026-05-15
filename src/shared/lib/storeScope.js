export function normalizeStoreId(storeId) {
  return typeof storeId === "string" ? storeId.trim() : "";
}

export function hasStoreScope(storeId) {
  return normalizeStoreId(storeId).length > 0;
}
