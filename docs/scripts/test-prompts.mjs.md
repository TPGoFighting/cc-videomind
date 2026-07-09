# scripts/test-prompts.mjs

## 文件路径
`scripts/test-prompts.mjs`

## 功能摘要
AI Prompt 对比测试脚本（使用 curl 调用 DeepSeek API）。

## 关键实现细节
1. 测试当前 Prompt 和改进版 Prompt 的对比
2. 使用 curl 调用 DeepSeek API
3. 输出摘要、要点、问题、亮点的详细信息
4. 提供质量对比分析

## 依赖关系
- node:fs - 文件操作
- node:child_process - 执行 curl 命令

## 关联的功能模块
- AI Prompt 优化