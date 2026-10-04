"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DEMO_FACILITIES, DEMO_ORIGIN } from "@/core/src/navigation/demo-facilities";
import { distanceKm } from "@/core/src/navigation/match";
import type { Facility } from "@/core/src/types";
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MarkerTooltip,
} from "@/components/ui/map";

const NEAR_KM = 6;

const LEVEL: Record<Facility["level"], string> = {
  health_post: "Clinic or dispensary",
  health_centre: "Health centre",
  district_hospital: "Hospital",
};

function destinationId(): string | null {
  try {
    const raw = localStorage.getItem("pumzi.decision");
    if (!raw) return null;
    const row = JSON.parse(raw) as { facility?: { facility_id?: unknown } };
    const id = row.facility?.facility_id;
    return typeof id === "string" ? id : null;
  } catch {
    return null;
  }
}

function MapCard({ destinationId: id }: { destinationId: string | null }) {
  const chosen = DEMO_FACILITIES.find((facility) => facility.id === id) ?? null;
  const shown = DEMO_FACILITIES.filter(
    (facility) => facility.id === chosen?.id || distanceKm(DEMO_ORIGIN, facility) <= NEAR_KM,
  );

  return (
    <div>
      <div className="map-frame">
        <Map theme="light" center={[DEMO_ORIGIN.lon, DEMO_ORIGIN.lat]} zoom={13}>
          <MapControls position="top-right" />
          <MapMarker longitude={DEMO_ORIGIN.lon} latitude={DEMO_ORIGIN.lat}>
            <MarkerContent>
              <div className="size-3 rotate-45 border-2 border-white bg-foreground shadow" />
            </MarkerContent>
            <MarkerTooltip>This clinic</MarkerTooltip>
            <MarkerPopup>
              <p className="font-medium">This clinic</p>
              <p className="text-xs text-muted-foreground">Where the worker is standing.</p>
            </MarkerPopup>
          </MapMarker>
          {shown.map((facility) => {
            const picked = facility.id === chosen?.id;
            const km = distanceKm(DEMO_ORIGIN, facility);
            return (
              <MapMarker key={facility.id} longitude={facility.lon} latitude={facility.lat}>
                <MarkerContent>
                  <div
                    className={
                      picked
                        ? "size-4 rounded-full border-2 border-white bg-destructive shadow"
                        : "size-2.5 rounded-full border border-white bg-primary/80 shadow"
                    }
                  />
                </MarkerContent>
                <MarkerTooltip>{facility.name}</MarkerTooltip>
                <MarkerPopup>
                  <p className="font-medium">{facility.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {LEVEL[facility.level]} · {km < 0.1 ? "under 0.1" : km.toFixed(1)} km
                  </p>
                  {picked && (
                    <p className="mt-1 text-xs">
                      This is the referral. The dataset does not say which services are offered.
                    </p>
                  )}
                </MarkerPopup>
              </MapMarker>
            );
          })}
        </Map>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Red is the referral. The square is this clinic. Streets load when there is a connection. The
        referral above does not wait for the map.
      </p>
    </div>
  );
}

export function FacilityMap() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    setPicked(destinationId());
    const root = document.getElementById("app");
    if (!root) return;
    const sync = () => setHost(document.getElementById("facility-map"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  if (!host) return null;
  return createPortal(<MapCard destinationId={picked} />, host);
}
