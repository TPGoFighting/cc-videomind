# lib/hooks/useCachedFetch.ts

## 文件路径
`lib/hooks/useCachedFetch.ts`

## 功能摘要
带本地缓存的数据获取 Hook（Stale-while-revalidate 模式）。

## 关键实现细节
1. `useCachedFetch<T>()` - 带缓存的数据获取
   - 首次访问：网络加载
   - 后续访问：localStorage 缓存即时渲染 + 后台静默刷新
   - 支持多用户缓存隔离（userId 参数）

2. 缓存机制：
   - 使用 localStorage 存储
   - 缓存键名前缀：`vm_cache:`
   - 缓存条目包含：data, userId, cachedAt

3. `mutate()` - 同时更新 state 和 localStorage

## 依赖关系
- `react` - useCallback, useEffect, useRef, useState

## 关联的功能模块
- 数据列表页面（历史、单词本、句子本等）