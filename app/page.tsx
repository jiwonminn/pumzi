"use client";

import { useEffect } from "react";
import "../src/styles.css";

export default function Home() {
  useEffect(() => {
    const root = document.querySelector("#app");
    if (!(root instanceof HTMLElement)) return;
    void import("../src/main").then((mod) => {
      mod.startHandoff(root);
    });
  }, []);

  return <div id="app" />;
}
