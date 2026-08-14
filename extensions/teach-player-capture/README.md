# Teach Player 一键转写（Chrome 插件）

此插件仅在用户从 Teach Player 发起、确认拥有或已获授权转写媒体后，采集**当前 B 站标签页**的音频。它不会下载 B 站视频，也不会读取其他标签页。

## 本地安装

1. 在 Chrome 打开 `chrome://extensions`，启用「开发者模式」。
2. 点击「加载已解压的扩展程序」，选择本目录 `extensions/teach-player-capture`。
3. 将 Teach Player 插件固定到浏览器工具栏。

## 使用流程

1. 登录 Teach Player，打开一个没有可用字幕的 B 站学习页。
2. 勾选授权确认，点击「使用浏览器转写」。
3. 插件会打开对应 B 站视频页；点击工具栏中的 Teach Player 图标开始采集。
4. 观看到需要的位置后，再点击一次图标结束；插件上传音频并自动打开生成的学习页。

## 生产前置条件

- 服务器已配置 `ASR_API_KEY` 与 `ASR_API_BASE_URL`。
- 受控调度器每分钟调用一次 `/api/worker`，以处理 `authorized_media_asr` 任务。
- Chrome 116 或更新版本；插件采用 Manifest V3、`tabCapture` 与 offscreen document。

一次性上传票据只在服务器保存 SHA-256 摘要，绑定当前登录用户和一个 BV/av 号，15 分钟有效且只能使用一次。
