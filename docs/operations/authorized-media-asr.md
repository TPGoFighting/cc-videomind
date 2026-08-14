# 本人或获授权媒体转写运行手册

此能力只处理用户主动上传、且其本人拥有或已获明确授权的媒体。它不是 B 站音视频抓取器：Bilibili 原视频仍由官方嵌入播放器展示；带时间码字幕仍是首选输入。

## 上线前置条件

1. 在腾讯云应用环境中设置 `ASR_API_KEY`、可选 `ASR_API_BASE_URL` 和 `ASR_MODEL`。密钥仅放在服务器环境中。
2. 设置独立且高熵的 `ASYNC_TASK_WORKER_SECRET`；不得复用会话、AI、支付或删除 Worker 密钥。
3. 确认 `/opt/teachplayer/uploads` 为持久目录，PM2 运行用户可读写，且备份策略不会把临时 `uploads/asr/` 作为长期归档。
4. 使用受控调度器每分钟调用一次 canonical 站点的 `POST /api/worker`。请求体必须是 `{}`，带 `Authorization: Bearer <ASYNC_TASK_WORKER_SECRET>`。一次调用只会原子认领一个待处理任务；空队列返回 `200 {"ok":true,"data":{"status":"idle"}}`。

可将 secret 存在仅 root 可读的环境文件后，由 systemd timer、受控 CI scheduler 或 PM2 cron 调用。不要把 secret 写进仓库、shell history、crontab 文本或日志。

## 推荐验收顺序

1. 不配 `ASR_API_KEY` 调用 `POST /api/bilibili/media`，确认返回 `503 asr_not_configured`，且没有新增任务、额度使用或 `uploads/asr` 文件。
2. 配置 ASR 后，使用一个已授权的短音频创建任务，确认返回 `202` 及私有 `bili_<uuid>`。
3. 触发一次受控 Worker 调度，确认任务状态按 `pending → running → completed` 变化，并在学习页读到时间戳字幕。
4. 检查对应 `uploads/asr/<uuid>.*` 已删除。再用一次可控失败的 ASR 响应确认任务为 `failed` 且文件同样已删除。
5. 以另一账号请求 `/api/tasks/<taskId>` 与 `/video/bili_<uuid>`，确认得到 `403` 或看不到内容。

## 失败处置

- `asr_not_configured`：不重试上传；先由运维恢复 ASR 配置。
- `task_failed`：原文件已清理，用户需重新提交仍持有授权的媒体；不要从 B 站重新抓取媒体补偿。
- 长时间 `pending`：先检查调度器、Worker Secret、canonical 域名和 PM2/Nginx 日志；不要手工把任务标为 completed。
- 因任务目录或权限异常无法清理：暂停新上传，定位精确的 `uploads/asr/` 文件并按既有数据保留流程处理，避免批量删除 `uploads/`。

## 保留边界

原始上传媒体只用于本次转写：Worker 在成功和失败路径都会尝试删除。转写得到的时间码字幕会保存在用户的私有学习工作台中，遵循账户导出和删除流程；不应被复用为公开 Bilibili 字幕缓存。
