# lib/youtube/transcript-provider.test.ts

## 文件路径

`lib/youtube/transcript-provider.test.ts`

## 功能摘要

`transcript-provider.ts` 的单元测试文件，使用 Node.js 内置 test runner（`node:test`），覆盖字幕解析、工具函数和轨道排序逻辑。

## 关键实现细节

### 测试覆盖范围

#### extractBalancedJson
- 简单单层 JSON、嵌套 JSON、字符串中的花括号、转义引号、单引号字符串
- 前面有其他文本的 JSON、跨行 JSON、无花括号/无法闭合/空字符串返回 null
- 转义反斜杠、数组中的花括号

#### parseCaptionContent — XML
- 新版 XML（毫秒时间戳 `<p t="1230" d="4560">`）
- 旧版 XML（秒级时间戳 `<text start="1.23" dur="4.56">`）
- 空标签过滤、HTML 实体解码、空 XML 返回空数组
- 缺少 d 属性的 p 标签

#### parseCaptionContent — VTT
- 标准 WebVTT、带 VTT 标签（`<c>` `<v>`）过滤
- 短时间戳格式（MM:SS）、逗号分隔毫秒、空 VTT、跨行文本

#### parseCaptionContent — JSON3
- 标准 JSON3 格式、无 events 返回空数组、无效 JSON 返回空数组

#### cleanCaptionText / decodeHtml
- HTML 标签去除、命名实体解码（6 种）、数字/十六进制实体解码
- `&nbsp;` 处理、多余空白合并、多行转单行

#### get / isRecord
- 正常/嵌套/数组索引取值、缺失 key、中间路径非对象、索引越界
- isRecord 对对象/数组/null/原始类型的判断

#### TranscriptError
- 错误码创建实例、全部 7 种错误码验证

#### 轨道排序逻辑（反射测试）
- 同语言去重保留手动字幕、首选指定语言、英语作为默认首选
- 只有自动字幕时使用自动字幕、空轨道列表返回空数组

#### 格式自动检测
- `<?xml` → XML、`WEBVTT` → VTT、`{` → JSON3、空字符串/未知格式返回空数组

### 运行方式

```bash
npx tsx --test lib/youtube/transcript-provider.test.ts
```

## 依赖关系

### import

| 模块 | 用途 |
|------|------|
| `node:test` | 测试框架（describe/it） |
| `node:assert/strict` | 断言 |
| `./transcript-provider` | 被测模块（全部导出函数和类型） |

## 关联的功能模块

- `lib/youtube/transcript-provider.ts` — 被测核心模块。
