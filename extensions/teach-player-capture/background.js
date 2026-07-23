const APP_ORIGINS = new Set(["https://video.tpgofighting.top", "https://teachplayer.tpgofighting.top"]);
const PENDING_KEY = "teachPlayerPendingCapture";

function sourceVideoId(url) {
  return new URL(url).pathname.match(/\/(BV[0-9A-Za-z]+|av\d+)/i)?.[1] ?? null;
}

async function ensureOffscreen() {
  const contexts = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
  if (!contexts.length) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["USER_MEDIA"],
      justification: "Capture user-authorized Bilibili tab audio for a requested Teach Player transcript.",
    });
  }
}

async function setState(tabId, text, title) {
  await chrome.action.setBadgeText({ tabId, text });
  await chrome.action.setBadgeBackgroundColor({ tabId, color: text ? "#E56767" : "#5BA8FF" });
  await chrome.action.setTitle({ tabId, title });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "teach-player:prepare-capture" || !sender.tab?.url) return;
  const appOrigin = new URL(sender.tab.url).origin;
  if (!APP_ORIGINS.has(appOrigin) || typeof message.ticket !== "string" || !sourceVideoId(`https://www.bilibili.com/video/${message.sourceVideoId}`)) {
    sendResponse({ ok: false, error: "invalid_request" });
    return;
  }
  chrome.storage.session.set({ [PENDING_KEY]: { sourceVideoId: message.sourceVideoId, ticket: message.ticket, appOrigin } })
    .then(async () => {
      await chrome.tabs.create({ url: `https://www.bilibili.com/video/${message.sourceVideoId}/`, active: true });
      sendResponse({ ok: true });
    })
    .catch(() => sendResponse({ ok: false, error: "open_bilibili_failed" }));
  return true;
});

chrome.action.onClicked.addListener(async (tab) => {
  const id = tab.id;
  const videoId = tab.url ? sourceVideoId(tab.url) : null;
  if (!id || !videoId) {
    if (id) await setState(id, "!", "请在 B 站视频标签页点击 Teach Player 插件");
    return;
  }
  const { [PENDING_KEY]: pending } = await chrome.storage.session.get(PENDING_KEY);
  if (!pending || pending.sourceVideoId.toLowerCase() !== videoId.toLowerCase()) {
    await setState(id, "!", "请先在 Teach Player 页面点击“使用浏览器转写”");
    return;
  }
  const capture = await chrome.tabCapture.getCapturedTabs();
  if (capture.some((item) => item.tabId === id && item.status === "active")) {
    chrome.runtime.sendMessage({ target: "offscreen", type: "teach-player:stop-capture" });
    await setState(id, "…", "正在上传音频并创建转写任务");
    return;
  }
  await ensureOffscreen();
  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: id });
  chrome.runtime.sendMessage({ target: "offscreen", type: "teach-player:start-capture", data: { streamId, tabId: id, ...pending } });
  await setState(id, "REC", "正在采集当前标签页音频；再次点击插件即可结束");
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== "teach-player:capture-finished") return;
  chrome.action.setBadgeText({ tabId: message.tabId, text: "" });
  if (message.videoId) chrome.tabs.create({ url: `${message.appOrigin}/video/${message.videoId}` });
  chrome.storage.session.remove(PENDING_KEY);
});
