# lib/utils/json.ts

## 文件路径
`lib/utils/json.ts`

## 功能摘要
JSON 解析工具函数，处理格式错误的 JSON。

## 关键实现细节
1. `extractBalancedJson()` - 括号计数法提取 JSON
   - 正确处理嵌套、字符串中的花括号和转义
   - 返回第一个完整的 JSON 对象

2. `repairBrokenJson()` - 修复常见 JSON 语法问题
   - 移除尾部逗号（在 } 或 ] 之前）
   - 保守策略：只有在完全没有双引号时才替换单引号

## 依赖关系
- 无外部依赖

## 关联的功能模块
- AI 输出解析（moments-validator.ts）
- JSON 容错处理