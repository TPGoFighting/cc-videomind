# lib/ai/provider-registry.ts

## 文件路径

`lib/ai/provider-registry.ts`

## 功能摘要

AI Provider 注册表，管理多模型 fallback 链的构建逻辑，支持通过环境变量配置备选模型。

## 关键实现细节

### 函数

- **`getModelFallbackChain(primaryModel)`** — 构建模型调用链：主模型放最前面，后面追加 `AI_FALLBACK_MODELS` 环境变量中解析出的去重备选模型。
- **`parseFallbackModels()`** — 从 `AI_FALLBACK_MODELS` 环境变量（逗号分隔）解析备选模型列表，自动去重并保持顺序。

### 设计策略

- 不硬编码任何厂商模型名，回退链完全由调用方配置决定。
- 所有备选模型共享同一个 `baseUrl`（MaaS 平台），只切换 model 名。
- 由 `provider.ts` 中的 `getAiProvider()` 动态导入并使用。

## 依赖关系

### import

无外部依赖。

### 被谁 import

- `lib/ai/provider.ts` — 动态导入 `getModelFallbackChain()` 用于构建 `OpenAiCompatibleProvider` 的模型链。

## 关联的功能模块

- `lib/ai/provider.ts` — AI Provider 工厂，使用 fallback 链创建 Provider 实例。
