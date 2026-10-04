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

// The published facility list has names, types and coordinates but no services. Until a
// facility says what it offers, assume by type the way the IMCI chart is built: any
// first-level facility treats the yellow classifications, and urgent (pink) referrals go
// to a hospital. The reason shown to the worker says when a service was assumed.
export const ASSUMED_BY_LEVEL: Record<Facility["level"], CareNeed[]> = {
  health_post: ["oral_rehydration", "antibiotics", "malaria_test", "clinician"],
  health_centre: ["oral_rehydration", "antibiotics", "malaria_test", "clinician"],
  district_hospital: [
    "pediatric_emergency",
    "oxygen",
    "iv_rehydration",
    "oral_rehydration",
    "antibiotics",
    "malaria_test",
    "clinician",
  ],
};

const isAssumed = (facility: Facility): boolean => facility.services.length === 0;
const servicesOf = (facility: Facility): CareNeed[] =>
  isAssumed(facility) ? ASSUMED_BY_LEVEL[facility.level] : facility.services;

const ASSUMED_NOTE = " Services assumed from the facility type.";
// The handoff screen rejects a longer reason, so the note is dropped rather than overflow it.
const MAX_WHY = 240;

type Ranked = FacilityRecommendation & { assumed: boolean };

const describe = (facility: Facility, need: CareNeed[], from: Point): Ranked => {
  const services = servicesOf(facility);
  return {
    facility_id: facility.id,
    name: facility.name,
    matched_services: need.filter((s) => services.includes(s)),
    missing_services: need.filter((s) => !services.includes(s)),
    distance_km: round1(distanceKm(from, facility)),
    why: "",
    assumed: isAssumed(facility),
  };
};

const finish = ({ assumed, ...rec }: Ranked, why: string): FacilityRecommendation => {
  const noted = why + ASSUMED_NOTE;
  return { ...rec, why: assumed && rec.matched_services.length > 0 && noted.length <= MAX_WHY ? noted : why };
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

  if (need.length === 0) {
    const nearest = [...ranked].sort((a, b) => a.distance_km - b.distance_km)[0];
    return {
      best: finish(nearest, `Closest facility in the offline list, for follow-up (${nearest.distance_km} km).`),
      alternatives: [],
    };
  }

  const top = ranked[0];
  const best =
    top.missing_services.length === 0
      ? finish(top, `Closest facility in the offline list that offers everything needed (${top.distance_km} km).`)
      : finish(
          top,
          `No facility in the offline list offers everything needed. Closest with the fewest gaps ` +
            `(missing: ${careNeedList(top.missing_services)}; ${top.distance_km} km). Confirm before travelling.`,
        );

  const alternatives = ranked.slice(1, 3).map((r) =>
    finish(
      r,
      r.missing_services.length === 0
        ? `Also offers everything needed (${r.distance_km} km).`
        : `Missing: ${careNeedList(r.missing_services)} (${r.distance_km} km).`,
    ),
  );

  return { best, alternatives };
}
