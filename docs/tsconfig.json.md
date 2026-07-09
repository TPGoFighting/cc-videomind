# tsconfig.json

## 文件路径
`tsconfig.json`

## 功能摘要
TypeScript 编译器配置。

## 关键实现细节
1. 编译选项：
   - target: ES2017
   - strict: true
   - module: esnext
   - moduleResolution: bundler
   - jsx: react-jsx

2. 路径别名：
   - `@/*` → `./*`

3. 包含文件：
   - next-env.d.ts
   - 所有 .ts/.tsx 文件
   - .next/types

## 依赖关系
- 无外部依赖

## 关联的功能模块
- TypeScript 编译