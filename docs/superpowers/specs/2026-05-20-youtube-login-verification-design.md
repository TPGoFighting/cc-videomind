# YouTube 登录验证功能

**日期:** 2026-05-20  
**状态:** 已批准

---

## 背景

YouTube 在第三方 WebView 环境中会弹出"请登录，以便我们确认你不是聊天机器人"的机器人验证。用户在 App 内观看 YouTube 视频时可能遇到此拦截，导致无法使用。

## 目标

在用户进入 App 功能前，强制完成 YouTube 登录验证，使 WebView Cookie 中已有 Google 登录态，播放器不再触发机器人验证。

## 设计

### 流程

```
App 启动 → 检查 youtube_verified 标记
    ├── 已验证 → 正常进入主界面
    └── 未验证 → 重定向到 /verify-youtube（全屏模态，不可返回）
                    ↓
              内嵌 WebView 加载 youtube.com
                    ↓
              用户在 WebView 内完成 Google 登录
                    ↓
              点击"我已完成登录"按钮
                    ↓
              标记 youtube_verified = true
                    ↓
              跳转回主界面
```

### 原理

`react-native-webview` 默认共享 Cookie 存储。验证页的 WebView 与 `react-native-youtube-iframe`（底层也是 `react-native-webview`）使用同一 Cookie 池，登录态自然共用。

### 文件变更

| 文件 | 操作 | 说明 |
|------|------|------|
| `app/verify-youtube.tsx` | 新增 | YouTube 验证页面：全屏 WebView + 引导文字 + 完成按钮 |
| `app/_layout.tsx` | 修改 | 注册 verify-youtube 路由为全屏模态（headerShown: false, gestureEnabled: false） |
| `src/hooks/use-youtube-verified.ts` | 新增 | 封装 youtube_verified 状态读写（基于 storage.ts） |
| `app/(tabs)/_layout.tsx` | 修改 | useEffect 中检查验证状态，未验证则 router.replace("/verify-youtube") |

### 验证页布局

```
┌─────────────────────────┐
│      YouTube 账号验证      │  ← 标题
│                         │
│  为了正常使用视频分析功能，  │  ← 说明文字
│  请先登录你的 YouTube 账号  │
│                         │
│                        ⚠ │  ← 警告：登录后请勿跳过
│  请在下方完成 Google 登录， │
│  登录成功后点击底部按钮     │
│                         │
├─────────────────────────┤
│                         │
│   [WebView: youtube.com] │  ← 占满剩余空间
│                         │
│                         │
│                         │
├─────────────────────────┤
│  [ 我已完成登录 ✓ ]      │  ← 确认按钮
└─────────────────────────┘
```

### 验证状态存储

使用已有的 `expo-sqlite` localStorage：

```
key: "youtube_verified"
value: "true" | undefined
```

读取：`storage.get("youtube_verified", false)`  
写入：`storage.set("youtube_verified", true)`  
清除：`storage.remove("youtube_verified")`（Settings 页可提供"重新验证"选项）

### WebView 配置

- URL: `https://www.youtube.com`
- JavaScript 启用
- DOM Storage 启用（保留 Cookie）
- 第三方 Cookie 允许
- 用户代理：默认（不要自定义，避免触发检测）

### 边缘情况

1. **网络不可用** → WebView 加载失败，显示"网络连接失败，请重试" + 重试按钮
2. **用户未登录直接点完成** → 允许确认，不做二次校验（用户自行承担风险，下次启动可重新验证）
3. **重新验证** → Settings 页提供入口，清除标记后重新走验证流程
