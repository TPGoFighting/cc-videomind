# scripts/test-bilibili.ts

## 文件路径
`scripts/test-bilibili.ts`

## 功能摘要
B站视频解析与 ASR 语音识别测试脚本。

## 关键实现细节
1. 测试短链接解析
2. 测试元数据抓取
3. 测试字幕/语音转写 (ASR)

## 依赖关系
- `../lib/bilibili/transcript-provider` - B站字幕提供者
- `../lib/bilibili/metadata` - B站元数据
- `../lib/bilibili/id` - B站 ID 解析

## 关联的功能模块
- B站视频集成