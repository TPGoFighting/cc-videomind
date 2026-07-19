"use client";

import { useEffect, useState } from "react";

/**
 * Keep the server render and the first client render identical. Responsive
 * content itself should be controlled with CSS; this hook is for client-only
 * behavior such as animations.
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < breakpoint);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [breakpoint]);

  return isMobile;
}
