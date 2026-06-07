/**
 * JSON 解析工具函数
 * 独立文件以避免 provider.ts ↔ moments-validator.ts 循环依赖
 */

/** 括号计数法提取 JSON —— 正确处理嵌套、字符串中的花括号和转义 */
export function extractBalancedJson(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === "\\" && inString) {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === "{") {
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

/** 修复常见 JSON 语法问题：尾部逗号、单引号 */
export function repairBrokenJson(json: string): string | null {
  // 移除尾部逗号（在 } 或 ] 之前）
  let repaired = json.replace(/,\s*([}\]])/g, "$1");
  // 保守策略：只有在完全没有双引号时才替换单引号
  if (!repaired.includes('"')) {
    repaired = repaired.replace(/'/g, '"');
  }
  return repaired;
}
