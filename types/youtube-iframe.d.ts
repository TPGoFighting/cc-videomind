declare namespace YT {
  class Player {
    constructor(elementId: string, options: PlayerOptions);
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    getCurrentTime(): number;
  }

  interface PlayerOptions {
    events?: PlayerEvents;
  }

  interface PlayerEvents {
    onReady?: (event: PlayerEvent) => void;
  }

  interface PlayerEvent {
    target: Player;
  }
}

interface Window {
  YT?: {
    Player: typeof YT.Player;
  };
  onYouTubeIframeAPIReady?: (() => void) | null;
}
