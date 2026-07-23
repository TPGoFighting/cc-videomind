window.addEventListener("message", (event) => {
  if (event.source !== window || event.data?.type !== "teach-player:prepare-capture") return;
  chrome.runtime.sendMessage(event.data, (response) => {
    window.postMessage({ type: "teach-player:capture-prepared", response: response ?? { ok: false, error: "extension_unavailable" } }, window.location.origin);
  });
});
