"use client";

import { useEffect } from "react";
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
      <nav className="w-full px-5 pt-4 sm:px-8">
        {/* A full page load on purpose: the handoff reads the saved decision once, when it starts. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="text-sm font-semibold text-teal-800 underline-offset-4 hover:underline">
          ← New case
        </a>
      </nav>
      <div id="app" />
    </>
  );
}
