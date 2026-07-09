# cc-videomind 代码审查发现与修复清单

> 审查对象：`/Users/tylertang/Developer/ai-coding/cc-videomind`（GitHub: tpgofighting/cc-videomind）
> 审查方式：第一性原理 + 对抗式审查（见项目根 `CLAUDE.md` / `AGENT.md`）
> 本文档是修复的唯一事实来源（single source of truth）。各子 Agent 只负责自己分区内的条目，互不改动对方文件。

## 通用约束（所有子 Agent 必须遵守）
- 工作目录：`/Users/tylertang/Developer/ai-coding/cc-videomind`
- **不要 commit、不要 push、不要 force push**（清理 git 历史需人工确认，不在本次自动范围内）。
- 不要运行 `npm install` / `npm run build` / `typecheck`（仓库未装依赖，且会拉取网络）。只做精确、可静态判断的编辑。
- 改动保持最小、向后兼容；尽量保留现有接口（如 `checkRateLimit` / `getClientKey` 的签名）。
- 若对某条无法安全修改，跳过并在返回里说明，不要硬改。

---

## 分区 A — 密钥与仓库卫生（P0 + 杂物）【Agent A】
负责文件：`.gitignore`、`scripts/`、`仓库根目录杂物`

### A1（🔴 P0）泄露的真实 API Key
- 证据：`scripts/_apikey.txt:1` 与 `scripts/_apikey_clean.txt:1` 含明文 `REMOVED_KEY`，且已 commit。
- 修复：
  1. 删除 `scripts/_apikey.txt`、`scripts/_apikey_clean.txt`、`scripts/extract-key.mjs`、`scripts/debug-env.mjs`（这些是调试时把 `.env` 里的 key 抽成明文的脚本，不应留存）。
  2. 在 `.gitignore` 追加：`scripts/_apikey*` 与 `scripts/extract-key.mjs`、`scripts/debug-env.mjs`。
  3. `git rm --cached` 上述已被跟踪的文件（让它们退出版本库但保留本地副本无妨，实际已删除则直接 rm）。
- 注意：**Key 已进 git 历史**。本次不强制清理历史（需 `git filter-repo`/BFG + 强推，由人工确认）。在文档/返回中提醒：必须在对应平台**立即吊销/轮换**该 Key。

### A2（🟡）仓库杂物与体积膨胀
- 证据：根目录 `.agents/`、`skills-lock.json` 是 AI 工具产物；`test-layout-current.png`(254KB)、`test-layout-new.png`(581KB)、`AI-Provider-JSON-修复报告.html`、`debug-report.html`、`mobile-feasibility-report.html` 等调试产物被提交。
- 修复：在 `.gitignore` 追加这些项；对已被跟踪的用 `git rm --cached`（保留磁盘文件）让其退出版本控制。建议忽略项：`.agents/`、`skills-lock.json`、`*.png` 类测试截图（如 `test-layout-*.png`）、`*.html` 调试报告（如 `*报告.html`、`*-report.html`）。注意 `.gitignore` 已忽略 `.env` 等，不要误伤。

---

## 分区 B — 限流与安全防护（P1）【Agent B】
负责文件：`lib/security/rate-limit.ts`、`lib/security/middleware.ts`、`app/api/**/route.ts`

### B1（🟠 P1）限流器在生产环境失效
- 证据：`rate-limit.ts` 用进程内存 `Map`。部署目标是 Cloudflare Workers（`package.json` 的 `deploy` 用 `@opennextjs/cloudflare`），各实例内存隔离 → 限流不共享、重启丢失，AI 接口可被刷爆产生费用。
- 修复（保持 `checkRateLimit(key, limit, windowMs)` 与 `getClientKey(request, scope)` 签名不变，使现有路由无需改调用）：
  1. 实现基于 **Cloudflare Durable Objects** 的限流（与部署目标一致），读写计数器放到 DO；保留「内存 Map 兜底」仅用于本地 dev（检测 `process.env.NODE_ENV !== 'production'` 或不存在 `CF_*` 环境时回退内存实现）。
  2. 在 `wrangler.jsonc` 中声明 Durable Object 绑定（如 `RATE_LIMITER`），并在 `open-next.config.ts` / worker 入口处实例化。
  3. 若 Durable Objects 成本/复杂度过高，允许退而求其次实现 **Upstash Redis** 版本（`@upstash/redis` + `@upstash/ratelimit`），同样保留内存兜底。
  4. 不要求联网验证，但代码必须类型正确、逻辑闭环。

### B2（🟠 P1）`withSecurity` 中间件是死代码，CSRF/方法校验未挂上
- 证据：`lib/security/middleware.ts` 的 `withSecurity` 全仓库无 import；路由仅各自手动调 `checkRateLimit`。README 声称「每路由统一 CSRF + 方法校验」不实。
- 修复：
  1. 把 `withSecurity` 真正应用到所有 `app/api/**/route.ts` 的 `POST`（及需要的 GET）处理函数上，使其统一执行：方法校验、CSRF（Origin/Referer 白名单）、body 大小、限流。
  2. 改造方式建议：各 route 的 `POST` 内用 `return withSecurity({...}).wrap(request, async () => { ...原有逻辑... })`；或抽一个 `export function apiPost(handler, cfg)` 便捷封装。保持现有 Zod 校验、鉴权、业务逻辑不动。
  3. 若某路由已有手动 `checkRateLimit` 调用，改为统一走 `withSecurity`，避免重复计数。

### B3 客户端 IP 取自可伪造头
- 证据：`getClientKey` 优先 `x-vercel-forwarded-for`，否则 `x-forwarded-for`（可伪造）。在 Cloudflare 部署下真实 IP 头是 `cf-connecting-ip`。
- 修复：在 `getClientKey` 中增加对 `cf-connecting-ip` 的优先读取；只有在确实拿到平台真实 IP 时才用作限流 key，否则降级为「每路由 token/用户级」key（如结合 `getAuthenticatedUserId`）而非纯 IP。

---

## 分区 C — 模型回退链可配置（P2）【Agent C】
负责文件：`lib/ai/provider-registry.ts`、`.env.example`（及必要时 `lib/ai/provider.ts` 默认值）

### C1（🟡）回退模型名写死，与 baseUrl 不匹配
- 证据：`getModelFallbackChain` 把 `deepseek-ai/DeepSeek-V3`、`Qwen/Qwen2.5-72B-Instruct`、`THUDM/glm-4-9b-chat` 写死。当 `AI_PROVIDER=openai-compatible` 且 baseUrl 为 OpenAI 官方时这些名字不存在 → 主模型一失败，回退全失败，无真正降级。
- 修复：
  1. 新增环境变量 `AI_FALLBACK_MODELS`（逗号分隔，可选）。
  2. `getModelFallbackChain(primary)`：返回 `[primary, ...(env 中解析出的回退列表，去重)]`；若未设置 env，给一个**通用安全默认**（如空数组，或仅与 primary 同家族的占位），不要硬编码特定厂商模型名。
  3. 在 `.env.example` 增加 `AI_FALLBACK_MODELS=` 及注释说明。
  4. `provider.ts` 中 `getResolvedConfig` 的默认 model（`deepseek-v4-flash`）如不合理可改为更稳妥的默认，但不要引入不存在的模型名假设。

---

## 分区 D — 日志卫生与文档对齐（P2）【Agent D】
负责文件：`lib/ai/provider.ts`（日志）、`README.md`、`CodeReview.md`

### D1（🟡）生产日志打印完整 prompt / 响应 / 用户内容
- 证据：`provider.ts` 大量 `console.log` 输出整段 prompt、AI 响应前 N 字、甚至用户字幕/问题。上线会记录 PII 且日志膨胀。
- 修复：
  1. 将调试日志改为受环境变量闸门控制（如 `DEBUG_AI` 或 `NODE_ENV !== 'production'` 才输出）；生产默认静默或仅输出错误/计数。
  2. 若必须保留，对 prompt/response 做截断与脱敏（不打印完整用户字幕/问题）。
  3. 保留计数类 `console.log`（如耗时、条数）但降级为 debug 级别或精简。

### D2（🟡）README / CodeReview 与现状不符
- 证据：`README.md` 称「30+ API 路由」「每路由统一 CSRF」；`CodeReview.md` 引用已不存在的 `app/api/webhooks/stripe/route.ts`；架构亮点描述与实际有偏差。
- 修复：
  1. `README.md`：按当前代码修正功能/路由数量描述；CSRF/方法校验若已由 B2 落实则如实写明，否则去掉该声明；确认「部署」段落与 `package.json` 脚本一致。
  2. `CodeReview.md`：删除/更正对 `webhooks/stripe` 路由的引用；把「待修复项」中与本次已修复条目对应的状态更新（如限流、CSRF、fallback 等），未做项保留。
  3. 不要编造未核实的内容；只改确认与代码不符之处。

---

## 验收（各 Agent 返回时需说明）
- 改了哪些文件、每条 Finding 的处理结果（已修 / 跳过+原因）。
- 是否引入了破坏性改动、是否保持了接口兼容。
- 对无法静态验证的项，明确标注「需人工/联网验证」。
