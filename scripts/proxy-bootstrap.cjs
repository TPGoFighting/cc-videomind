const { ProxyAgent, setGlobalDispatcher } = require("undici");
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
if (proxyUrl) {
  const agent = new ProxyAgent(proxyUrl);
  setGlobalDispatcher(agent);
  console.log("🌐 [TeachPlayer Bootstrap] Global ProxyAgent set to", proxyUrl);
}
