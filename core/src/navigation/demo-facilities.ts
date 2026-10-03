// SYNTHETIC DEMO DATA. These facilities, names, locations and services are invented
// for the demo and are labelled that way in the app. Replace them with a real export
// (for example healthsites.io) before any real use.

import type { Facility } from "../types";

const SOURCE = "synthetic demo data";

/** Where the demo health worker is (Ondera, the brief's fictional highlands). */
export const DEMO_ORIGIN = { lat: -0.42, lon: 36.95 };

export const DEMO_FACILITIES: Facility[] = [
  {
    id: "fac-001",
    name: "Ondera Health Post",
    lat: -0.425,
    lon: 36.955,
    level: "health_post",
    services: ["oral_rehydration", "malaria_test"],
    source: SOURCE,
  },
  {
    id: "fac-002",
    name: "Hillside Health Centre",
    lat: -0.39,
    lon: 36.99,
    level: "health_centre",
    services: ["oral_rehydration", "malaria_test", "antibiotics", "clinician"],
    source: SOURCE,
  },
  {
    id: "fac-003",
    name: "District Clinic B",
    lat: -0.47,
    lon: 36.99,
    level: "health_centre",
    services: [
      "pediatric_emergency",
      "iv_rehydration",
      "oral_rehydration",
      "antibiotics",
      "malaria_test",
      "clinician",
    ],
    source: SOURCE,
  },
  {
    id: "fac-004",
    name: "Valley Dispensary",
    lat: -0.36,
    lon: 36.9,
    level: "health_post",
    services: ["oral_rehydration", "antibiotics"],
    source: SOURCE,
  },
  {
    id: "fac-005",
    name: "Ondera District Hospital",
    lat: -0.3,
    lon: 37.08,
    level: "district_hospital",
    services: [
      "pediatric_emergency",
      "oxygen",
      "iv_rehydration",
      "oral_rehydration",
      "antibiotics",
      "malaria_test",
      "clinician",
    ],
    source: SOURCE,
  },
];
