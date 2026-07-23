# Demo 说明

本目录包含 Teach Player (VideoMind) 的产品界面截图与访问方式。

## 在线体验（推荐）
- Web 应用：https://teachplayer.tpgofighting.top
- 演示视频（Bilibili）：https://www.bilibili.com/video/BV1nJV36KEnV

## 截图说明
| 文件 | 说明 |
|------|------|
| `首页与视频工作区.png` | 首页（粘贴 YouTube 链接）与视频工作区（播放器 + 转录 / Chat / 笔记 / 复习 Tab）的实际界面 |
| `工作区布局对比.png` | 工作区布局的设计迭代对比 |

## 本地运行
```bash
npm install
npm run dev        # 启动开发服务器 http://localhost:3000
npm run build      # 生产构建
npm run typecheck  # 类型检查
```
详见仓库 README.md。需要配置 Supabase 与 AI Provider 环境变量（参考 .env.example）。

## AI 工作流程图
- 见 `../产品方案.html` 第 4 节（内嵌 Mermaid 流程图，浏览器打开即可渲染）。
- 文字版流程见 `../产品方案.md` 第 4 节。
