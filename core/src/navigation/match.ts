// Picks the closest facility that can actually provide the care needed, not just the nearest one.

import type { CareNeed, Facility, FacilityRecommendation } from "../types";
import { careNeedList } from "./care-labels";

export type Point = { lat: number; lon: number };

const EARTH_RADIUS_KM = 6371;

// Straight-line (haversine) distance. Real travel time will be longer.
export function distanceKm(a: Point, b: Point): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

const round1 = (n: number) => Math.round(n * 10) / 10;

const describe = (facility: Facility, need: CareNeed[], from: Point): FacilityRecommendation => {
  const matched = need.filter((s) => facility.services.includes(s));
  const missing = need.filter((s) => !facility.services.includes(s));
  return {
    facility_id: facility.id,
    name: facility.name,
    matched_services: matched,
    missing_services: missing,
    distance_km: round1(distanceKm(from, facility)),
    why: "",
  };
};

export type NavigationResult = {
  best: FacilityRecommendation | null;
  alternatives: FacilityRecommendation[];
};

// Full matches win, closest first. If nothing offers everything, the fewest missing services
// wins and the reason says so. With no care needed, it's just the nearest facility for follow-up.
export function recommendFacility(need: CareNeed[], from: Point, facilities: Facility[]): NavigationResult {
  if (facilities.length === 0) return { best: null, alternatives: [] };

  const ranked = facilities
    .map((f) => describe(f, need, from))
    .sort((a, b) => a.missing_services.length - b.missing_services.length || a.distance_km - b.distance_km);

  const best = { ...ranked[0] };
  if (need.length === 0) {
    const nearest = [...ranked].sort((a, b) => a.distance_km - b.distance_km)[0];
    return {
      best: { ...nearest, why: `Closest facility in the offline list, for follow-up (${nearest.distance_km} km).` },
      alternatives: [],
    };
  }

  if (best.missing_services.length === 0) {
    best.why = `Closest facility in the offline list that offers everything needed (${best.distance_km} km).`;
  } else {
    best.why =
      `No facility in the offline list offers everything needed. This one is closest among those missing the fewest ` +
      `services (missing: ${careNeedList(best.missing_services)}; ${best.distance_km} km). Confirm before travelling if possible.`;
  }

  const alternatives = ranked.slice(1, 3).map((r) => ({
    ...r,
    why:
      r.missing_services.length === 0
        ? `Also offers everything needed (${r.distance_km} km).`
        : `Missing: ${careNeedList(r.missing_services)} (${r.distance_km} km).`,
  }));

  return { best, alternatives };
}
