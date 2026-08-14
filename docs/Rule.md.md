# Rule.md

## 文件路径
`Rule.md`

## 功能摘要
任务规则文档。

## 关键实现细节
1. 任务：实现 transcript provider 接口和 mock provider
2. 需要创建的文件：lib/transcript/ 下的类型、接口、mock 实现
3. 要求：Zod 验证、返回 TranscriptSegment[]、mock 要确定性且真实
4. 验证：运行 typecheck 和 lint

## 依赖关系
- 无外部依赖

## 关联的功能模块
- 开发任务规范