let active;

chrome.runtime.onMessage.addListener(async (message) => {
  if (message?.target !== "offscreen") return;
  if (message.type === "teach-player:start-capture") await start(message.data);
  if (message.type === "teach-player:stop-capture") await stop();
});

async function start(data) {
  if (active) return;
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: data.streamId } },
    video: false,
  });
  const audio = new AudioContext();
  audio.createMediaStreamSource(stream).connect(audio.destination);
  const chunks = [];
  const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
  recorder.onstop = async () => {
    try {
      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      const duration = Math.max(1, Math.round((Date.now() - active.startedAt) / 1000));
      const body = new FormData();
      body.append("file", blob, "teach-player-bilibili.webm");
      body.append("sourceVideoId", active.sourceVideoId);
      body.append("duration", String(duration));
      const response = await fetch(`${active.appOrigin}/api/extension/capture-upload`, {
        method: "POST", headers: { "x-teach-player-capture-ticket": active.ticket }, body,
      });
      const payload = await response.json();
      chrome.runtime.sendMessage({ type: "teach-player:capture-finished", tabId: active.tabId, appOrigin: active.appOrigin, videoId: payload?.data?.videoId });
    } finally {
      stream.getTracks().forEach((track) => track.stop());
      await audio.close();
      active = undefined;
    }
  };
  active = { ...data, stream, recorder, startedAt: Date.now() };
  recorder.start(1000);
}

async function stop() { active?.recorder.stop(); }
