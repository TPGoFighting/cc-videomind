# lib/hooks/useYouTubeStatus.ts

## 文件路径
`lib/hooks/useYouTubeStatus.ts`

## 功能摘要
检测 YouTube 是否可访问的 Hook。

## 关键实现细节
1. `useYouTubeStatus()` - 检测 YouTube 可访问性
   - 第一步：检测网络可达性（no-cors 模式）
   - 第二步：尝试加载 IFrame API（判断浏览器环境兼容性）

2. 状态类型：
   - `checking` - 检测中
   - `available` - 可用
   - `blocked` - 网络不可达
   - `restricted` - IFrame API 不可用

## 依赖关系
- `react` - useEffect, useState

## 关联的功能模块
- YouTube 播放器显示