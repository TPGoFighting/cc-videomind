const TAB_NAVIGATION_KEYS = new Set(["ArrowLeft", "ArrowRight", "Home", "End"]);

export function isTabNavigationKey(key: string): boolean {
  return TAB_NAVIGATION_KEYS.has(key);
}

export function getNextTabIndex(currentIndex: number, key: string, tabCount: number): number {
  if (tabCount <= 0) return 0;

  switch (key) {
    case "ArrowLeft":
      return (currentIndex - 1 + tabCount) % tabCount;
    case "ArrowRight":
      return (currentIndex + 1) % tabCount;
    case "Home":
      return 0;
    case "End":
      return tabCount - 1;
    default:
      return currentIndex;
  }
}
