/**
 * Verification/audit photos for the real SOW area types
 * (data/SOW_DeltaLGA.csv). Customer-provided files live in
 * public/SOWimages, named by area type rather than by
 * building/area, so one area type's photo set is shared across
 * every building and every specific area of that type — there's no
 * per-area or per-building photography, just a representative shot
 * per area type.
 *
 * Not every real area type has a supplied photo set:
 * - Janitorial Closets, Make-Up Carousels, Service Elevators — no
 *   files were provided for these.
 * - Exterior Stairwells and Stairwells (Passenger) share the one
 *   generic "stairwell" pair (Fire Stairwells has its own distinct
 *   set, so it isn't part of this fallback).
 *
 * A few extra sets (Terrace, Trashing/Compactor, Elevator Lobby)
 * are also included even though those area types currently have
 * zero contracted tasks in the export (see
 * data/SOW_Data_Dictonary.csv's Known Issues) and so never appear
 * in the modeled tree today — kept here so they light up
 * automatically if that data ever fills in.
 */

const AREA_TYPE_IMAGES: Record<string, string[]> = {
  "Baggage Carousels": ["baggagecaroseul1.jpg", "baggagecaroseul2.jpg", "baggagecaroseul3.jpg"],
  "Baggage Checks": ["baggagecheck1.jpg", "baggagecheck2.jpg", "baggagecheck3.jpg"],
  "Baggage Claims": ["baggageclaim1.jpg", "baggageclaim2.jpg", "baggageclaim3.jpg"],
  "Break Rooms": ["breakroom1.jpg", "breakroom2.jpg", "breakroom3.jpg", "breakroom4.jpg"],
  "Conference Rooms": ["conferenceroom1.jpg", "conferenceroom2.jpg"],
  "Corridors (Passenger)": ["corridor1.jpg", "corridor2.jpg", "corridor3.jpg", "corridor4.jpg"],
  Curbsides: ["curbside1.jpg", "curbside2.jpg", "curbside3.jpg"],
  "Elevators (Passenger)": ["elevatars1.jpg", "elevators2.jpg", "elevators3.jpg"],
  Escalators: ["escalator1.jpg", "escalator2.jpg", "escalator3.jpg"],
  "Exterior Stairwells": ["stairwell1.jpg", "stairwell2.jpg"],
  "Fire Stairwells": ["firestairwells1.jpg", "firestairwells2.jpg", "firestairwells3.jpg"],
  "Fitness Areas": ["fitnessarea1.jpg", "fitnessarea2.jpg", "fitnessarea3.jpg"],
  Gates: ["gates1.jpg", "gates2.jpg", "gates3.jpg"],
  "Help Desk": ["helpdesk.jpg", "helpdesk2.jpg", "helpdesk3.jpg", "helpdesk4.jpg"],
  "Jet Bridges": ["jetbridges1.jpg", "jetbridges2.jpg", "jetbridges3.jpg"],
  Kitchenettes: ["kitchenette1.jpg", "kitchenette2.jpg", "kitchenette3.jpg"],
  "Locker Rooms": ["lockerroom1.jpg", "lockerroom2.jpg", "lockerroom3.jpg"],
  "Mother's Rooms": ["mothersroom1.jpg", "mothersroom2.jpg", "mothersroom3.jpg"],
  Offices: ["offices1.jpg", "offices2.jpg", "offices3.jpg", "offices4.jpg"],
  "People Movers": ["peoplemovers1.jpg", "peoplemovers2.jpg", "peoplemovers3.jpg"],
  "Pet Relief Areas": ["petrelief1.jpg", "petrelief2.jpg", "petrelief3.jpg"],
  Ramps: ["ramps1.jpg", "ramps2.jpg", "ramps3.jpg"],
  "Reception Areas": ["receptionarea1.jpg", "receptionarea2.jpg", "receptionarea3.jpg"],
  "Religious Reflection": ["religious reflection1.jpg", "religiousreflection2.jpg", "religiousreflection3.jpg"],
  Restrooms: ["restrooms1.jpg", "restrooms2.jpg", "restrooms3.jpg", "restrooms4.jpg"],
  "Restrooms (Passenger)": [
    "restroomspassenger1.jpg",
    "restroomspassenger2.jpg",
    "restroompassengers3.jpg",
    "restroomspassenger4.jpg",
    "restroomspassenger5.jpg",
    "restroomspassenger6.jpg",
  ],
  "Service Corridors": ["servicecorridor1.jpg", "servicecorridor2.jpg", "servicecorridor3.jpg", "servicecorridor4.jpg"],
  "Shower Rooms": ["showerroom1.jpg", "showerroom2.jpg", "showerroom3.jpg"],
  "Sleep Rooms": ["sleeproom1.jpg", "sleeprroom2.jpg"],
  "Stairwells (Passenger)": ["stairwell1.jpg", "stairwell2.jpg"],
  "Storage Rooms": ["storageroom1.jpg", "storageroom2.jpg", "storageroom3.jpg"],
  "TSA Checkpoints": ["tsacheckpoints1.jpg", "tsacheckpoints2.jpg", "tsacheckpoints3.jpg"],
  Ticketing: ["ticketing1.jpg", "ticketing2.jpg", "ticketing3.jpg"],
  Vestibules: ["vestibule1.jpg", "vestibule2.jpg", "vestibule3.jpg"],
  // Zero-task area types today (see file doc comment) — not yet reachable
  // through the modeled tree, but ready for when the export fills in.
  Terrace: ["terrace1.jpg", "terrace2.jpg", "terrace3.jpg"],
  "Trashing/Compactor": ["compactors1.jpg", "compactors2.jpg", "compactors3.jpg"],
  "Elevator Lobby": ["elevatorlobby1.jpg", "elevatorlobby2.jpg", "elevatorlobby3.jpg"],
};

/**
 * Aliases for the handful of illustrative "Recent activity" location
 * strings (lib/sowData.ts's recentVerifications/recentAudits) that
 * don't spell the area type exactly the way the real export does —
 * e.g. "Curbside — Family Pick Up 1" rather than "Curbsides".
 */
const LOCATION_ALIASES: Record<string, string> = {
  curbside: "Curbsides",
  "break room": "Break Rooms",
  "baggage check": "Baggage Checks",
};

function toImagePath(file: string): string {
  return `/SOWimages/${encodeURIComponent(file)}`;
}

/** All photos supplied for a real area type name, or an empty array if none were provided. */
export function areaTypePhotos(areaTypeName: string): string[] {
  return (AREA_TYPE_IMAGES[areaTypeName] ?? []).map(toImagePath);
}

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  return Math.abs(hash);
}

/** Deterministically picks one of an area type's photos, varying by `seed` so repeated cards for the same area type don't all show the identical shot. */
export function photoForAreaType(areaTypeName: string, seed: string): string | undefined {
  const photos = areaTypePhotos(areaTypeName);
  return photos.length > 0 ? photos[hashSeed(seed) % photos.length] : undefined;
}

/**
 * Resolves a photo from a free-form "location" string, e.g.
 * "Break Rooms — Zone 1" or "Curbside — Family Pick Up 1" — takes
 * the part before the em dash (or the whole string, for a
 * dash-less location like "Gate 72"), matches it against the real
 * area type names, falling back to the alias table and a trailing
 * -number/plural guess ("Gate 72" → "Gate" → "Gates").
 */
export function photoForLocation(location: string, seed: string): string | undefined {
  const head = location.split(" — ")[0].trim();
  const areaTypeName = resolveAreaTypeName(head);
  return areaTypeName ? photoForAreaType(areaTypeName, seed) : undefined;
}

function resolveAreaTypeName(head: string): string | undefined {
  if (AREA_TYPE_IMAGES[head]) return head;
  const alias = LOCATION_ALIASES[head.toLowerCase()];
  if (alias) return alias;
  const withoutTrailingNumber = head.replace(/\s*\d+$/, "").trim();
  if (AREA_TYPE_IMAGES[withoutTrailingNumber]) return withoutTrailingNumber;
  const pluralGuess = `${withoutTrailingNumber}s`;
  if (AREA_TYPE_IMAGES[pluralGuess]) return pluralGuess;
  return undefined;
}
