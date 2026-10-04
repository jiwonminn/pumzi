"use client";

import { useEffect } from "react";
import { FacilityMap } from "@/components/FacilityMap";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import "../../src/styles.css";

export default function Handoff() {
  useEffect(() => {
    const root = document.querySelector("#app");
    if (!(root instanceof HTMLElement)) return;
    void import("../../src/main").then((mod) => {
      mod.startHandoff(root);
    });
  }, []);

  return (
    <>
      <nav className="w-full px-5 pt-3">
        {/* A full page load on purpose: the handoff reads the saved decision once, when it starts. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          New case
        </a>
      </nav>
      <FacilityMap />
      <div id="app" />
    </>
  );
}
