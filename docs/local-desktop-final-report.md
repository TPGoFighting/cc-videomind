# TeachPlayer 本地桌面化改造报告

日期：2026-07-10  
范围：本地优先数据链路、SaaS 清理、长字幕性能、Tauri 构建与运行时验证。

## 产品决策

本轮按产品设计工作流的「定义 → 流程 → 验证」推进，并以两个原则约束实现。

- 第一性原理：用户需要的是可靠地把公开视频变成可复习资料；登录、配额、支付和云端依赖不是这个闭环的必要条件。
- 快速迭代原则：先保留最短可验证链路——抓取字幕、立即展示、后台生成学习材料、持久化到本机——再逐步增强桌面壳与流式反馈。

目标用户是单机学习者；核心成功标准是：无需账号即可完成「视频 → 转录 → AI 分析 → 历史、笔记、单词、翻译和任务」闭环，且长视频不会因单次超大提示词而退化或超时。

## 已完成

### 本地存储接线

`LOCAL_MODE=1` 时，以下能力已实际使用 `lib/db/local-store.ts` 的 sql.js 数据库，不再访问 Supabase：

| 能力 | 接线位置 | 本地行为 |
| --- | --- | --- |
| 分析缓存与历史 | `lib/supabase/cache.ts`、`app/api/history` | 分析、字幕和元数据写入 `analysis`；历史页可直接读取 |
| 翻译版本 | `app/api/translations`、`app/api/translate-transcript` | 翻译流结束后保存版本，并回写本地字幕缓存 |
| 笔记 | `app/api/notes` | 读取、创建、删除均落入 `notes` |
| 单词本 | `app/api/user-vocabulary` | 收藏、读取、删除均落入 `user_vocabulary` |
| 间隔复习与同步 | `app/api/review`、`app/api/sync/notebook` | SM-2 状态和本地同步均不再要求云端账号 |
| 异步任务 | `lib/async/task-manager.ts` | 创建、状态更新、查询切换到 `async_tasks` |

本地模式仍保留 API 的输入校验、安全包装与既有响应形状，前端无须为这些路由分叉。

### SaaS UI 清理

- 移除了 `/subscribe` 页面与首页 `pricing-section`。
- 删除首页的定价区、右侧滚动导航中的「方案」项，以及所有指向订阅页的主导航、Hero 和配额错误 CTA。
- 路线图调整为「AI 并发优化 + 本地优先」，不再宣传支付或订阅功能。

### 长字幕性能

`generateComprehensiveAnalysis` 现在根据字幕段数选择策略：

```text
≤ 220 段：单次完整分析
> 220 段：8 分钟切片（30 秒重叠）
       → 最多 3 路并发提取带时间戳的事实笔记
       → 单次 Reduce 汇总为完整分析
```

该策略限制单个提示词的体积，并保留源时间戳，避免「只采样开头/中段/结尾」造成的长视频信息遗漏。短视频没有额外调用成本。

## 验证结果

- `npm run typecheck`：通过。
- `npm run test`：通过。
- `npm run lint`：未作为通过项；现有代码库有 21 个 `no-explicit-any` / React effect lint 错误（包含未修改的 Bilibili、Worker、DB 与认证代码），需单独清理，不属于本轮本地化接线改动。
- Node 26 下的 `npm run build`：通过；构建产物包含本轮本地数据路由。
- 本地开发服务：以 Node 26 和 `LOCAL_MODE=1` 成功打开首页；首页非空、无相关 console error/warn，定价区已不存在。
- 浏览器交互：首页渲染证据已取得；后续滚动交互时 in-app browser WebView 连接被回收，未使用另一套自动化工具绕过该限制。

## Tauri 状态

- 已安装 Rust stable `1.97.0`（Apple Silicon）。
- Tauri CLI v2.11.4 已完成安装。
- 已实际运行 `cargo tauri build`；Tauri 在 Rust 编译前按预期停止，报错为 `frontendDist` 指向的 `../out` 不存在。
- 当前 Next 应用未设置静态导出，且 `src-tauri/icons/*` 与 yt-dlp sidecar 尚未提供。因此真正的安装包构建仍受前端产物、图标和 sidecar 依赖阻断；这不是 Rust 源码编译错误。

## 后续建议

1. 为桌面端明确前端策略：让 Tauri 连接本地 Next server，或建立不依赖 Next Route Handler 的静态桌面前端；两者不能混用。
2. 补齐本地复习（SM-2）与词义缓存表，完全移除剩余的 Supabase 读取路径。
3. 把分析阶段升级为客户端可消费的 SSE 进度事件：`切片数 → 已完成切片 → 汇总中 → 完成`，让长视频处理过程可见。
4. 提供 macOS arm64 的 yt-dlp sidecar 与 Tauri 图标后，运行 `cargo tauri build` 做真实安装包验收。
