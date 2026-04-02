const byOwnerId: Record<string, string> = {
  "seed-jules": "/profile-jules.svg",
  "seed-avery": "/profile-avery.svg",
  "seed-nia": "/profile-nia.svg",
};

const coverByOwnerId: Record<string, string> = {
  "seed-jules": "/cover-jules.svg",
  "seed-avery": "/cover-avery.svg",
  "seed-nia": "/cover-nia.svg",
};

const byName: Record<string, string> = {
  "nia blaze": "/profile-nia.svg",
  "mila cortez": "/profile-mila.svg",
  "ari nova": "/profile-ari.svg",
  "skye luna": "/profile-skye.svg",
};

const coverByName: Record<string, string> = {
  "nia blaze": "/cover-nia.svg",
  "mila cortez": "/cover-mila.svg",
  "ari nova": "/cover-ari.svg",
  "skye luna": "/cover-skye.svg",
};

const modelNames = ["Jules", "Avery", "Nia", "Nia Blaze", "Mila Cortez", "Ari Nova", "Skye Luna"];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function profileSlug(name: string) {
  return normalize(name)
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

export function knownModelSlugs() {
  return Array.from(new Set(modelNames.map((name) => profileSlug(name))));
}

export function profileImageFor(input: { ownerId?: string; name?: string | null }) {
  if (input.ownerId && byOwnerId[input.ownerId]) {
    return byOwnerId[input.ownerId];
  }
  if (input.name) {
    const normalized = normalize(input.name);
    if (byName[normalized]) {
      return byName[normalized];
    }
  }
  return "/profile-default.svg";
}

export function profileCoverFor(input: { ownerId?: string; name?: string | null }) {
  if (input.ownerId && coverByOwnerId[input.ownerId]) {
    return coverByOwnerId[input.ownerId];
  }
  if (input.name) {
    const normalized = normalize(input.name);
    if (coverByName[normalized]) {
      return coverByName[normalized];
    }
  }
  return "/cover-default.svg";
}

export function profileGalleryFor(input: { ownerId?: string; name?: string | null }) {
  const seed = input.ownerId ?? normalize(input.name ?? "default");
  if (seed.includes("jules") || seed.includes("mila")) {
    return ["/gallery-gold.svg", "/gallery-teal.svg", "/gallery-night.svg"];
  }
  if (seed.includes("avery") || seed.includes("ari")) {
    return ["/gallery-neon.svg", "/gallery-night.svg", "/gallery-teal.svg"];
  }
  return ["/gallery-teal.svg", "/gallery-gold.svg", "/gallery-neon.svg"];
}
