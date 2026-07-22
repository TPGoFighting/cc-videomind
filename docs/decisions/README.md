# Architecture Decision Records

Teach Player 使用 ADR 记录会影响生产运行时、数据所有权、产品边界、安全、商业化或发布方式的长期决策。

## 使用规则

1. 从 `0000-template.md` 复制一份新文件，编号递增，文件名使用简短的 kebab-case 决策名称。
2. 决策状态只使用 `Proposed`、`Accepted`、`Superseded` 或 `Deprecated`。
3. `Accepted` 必须注明决策人、确认日期、实施边界和回滚方式。
4. ADR 只记录为什么选择某条路径，不替代实施任务、迁移脚本、运行手册或验收证据。
5. 若后续改变决定，新增 ADR 并在旧 ADR 中写明 `Superseded by`，不得静默改写历史理由。

## 编号约定

- `0000-template.md`：模板，不代表真实决策。
- `0001-*` 起：正式决策，按创建顺序递增。

## 当前决策

- [`0001-tencent-runtime-and-data-authority.md`](0001-tencent-runtime-and-data-authority.md)：腾讯云 PM2 + PostgreSQL 作为唯一生产权威；Cloudflare 仅承担边缘职责。
