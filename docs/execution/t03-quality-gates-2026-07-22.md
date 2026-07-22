# T03 工程质量门禁证据（2026-07-22）

## 结果

T03 的代码与本地干净环境验收已完成。远端 GitHub Actions 首次运行和仓库分支保护仍需在分支推送、创建 PR 后验证；本记录不把本地工作流文件等同于远端 CI 已启用。

## 运行时与依赖

- 项目最低 Node.js 版本：`>=22.0.0`
- `.nvmrc`：`22`
- GitHub Actions：Node.js 22
- 本地验收运行时：Node.js 26.5.0（满足最低版本）
- 包管理器：npm，锁文件为 `package-lock.json`
- `tsx` 已固定在 `devDependencies`，测试脚本使用 `node --import tsx --test`，不使用 `npx` 临时下载。

## 干净环境

在 `/private/tmp/videomind-ci.U3XskU` 创建不包含 `.git`、`node_modules`、`.next`、`.open-next` 的隔离副本。当前工作区的依赖目录未被删除或重装。

按顺序执行：

1. `npm ci`：退出码 0，安装 768 个包。
2. `npm run lint`：退出码 0，0 error，0 warning。
3. `npm run typecheck`：退出码 0。
4. `npm run test`：退出码 0；新增合同测试前为 134/134，通过最终同步后为 141/141。
5. `npm run build`：退出码 0；Next.js 16.2.6 webpack 生产构建生成 48 个页面/路由入口。

生产构建单独运行，因此其“Skipping validation of types”提示不代表跳过门禁；此前独立的 `npm run typecheck` 已退出码 0。

## 本次修复

- 将 ESLint 从 19 errors / 15 warnings 收敛到 0 / 0，没有关闭规则或把错误降级为 warning。
- 移除 API、Bilibili 流式转录、数据库行和视频流中的显式 `any`，改为联合类型、类型守卫和 `unknown` 边界。
- 修复本地认证初始化中的 effect 同步状态更新问题。
- 固化 Node.js、webpack 构建和本地测试运行方式。
- 新增 GitHub Actions 工作流，按 `npm ci → lint → typecheck → test → build` 执行。
- 新增 YouTube ID、匿名与配额边界、Tencent Session Cookie/Bearer、AI 缺配置和 ASR 缺配置合同测试；测试不访问真实 AI、支付、用户数据库或生产凭证。

## 已知风险与未完成外部项

- `npm ci` 的全量审计摘要为 14 个漏洞（3 low、11 high）；`npm audit --omit=dev` 进一步确认生产依赖仍有 2 个 high，路径为 `next → sharp → libvips`。npm 给出的自动修复会跨 Next.js 大版本，不能安全套用；npm registry 显示较新的 Sharp 版本为 0.35.3，而当前 Next/Miniflare 约束为 `^0.34.5`，需建立兼容性验证后再升级。未执行可能引入破坏性变化的 `npm audit fix --force`。
- npm 还提示 7 个依赖含待审核安装脚本；隔离环境的生产构建已成功，但后续应明确 allow-scripts 策略。
- `.github/workflows/ci.yml` 尚未在远端 PR 上实际运行；分支保护是否把该 job 设为必需检查尚未验证。
