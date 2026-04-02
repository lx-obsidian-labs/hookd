export const FAVORITES_STORAGE_KEY = "hooked.web.favorite-models.v1";

export function readFavoriteOwnerIds() {
  if (typeof window === "undefined") {
    return [] as string[];
  }
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeFavoriteOwnerIds(ownerIds: string[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(ownerIds));
}

export function toggleFavoriteOwner(ownerIds: string[], ownerId: string) {
  return ownerIds.includes(ownerId)
    ? ownerIds.filter((id) => id !== ownerId)
    : [...ownerIds, ownerId];
}
