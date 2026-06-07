"use client";

import { useState } from "react";
import type { DisplayMode } from "@/lib/types";

export function useDisplayMode(defaultMode: DisplayMode = "en") {
  const [displayMode, setDisplayMode] = useState<DisplayMode>(defaultMode);
  return { displayMode, setDisplayMode };
}
