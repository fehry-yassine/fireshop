export function formatDisplayOrderReference(id: string) {
  const normalizedId = id.replace(/[^a-z0-9]/gi, "").toUpperCase();
  const suffix = normalizedId.slice(-4);

  return `CMD-${suffix || "0000"}`;
}
