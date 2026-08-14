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

/**
 * 从 thinking 文本中智能提取 JSON
 * LongCat 等 API 返回 thinking 块，JSON 嵌在推理过程中
 */
export function extractJsonFromThinking(text: string): string | null {
  // 策略1：尝试从最后一个 ```json ... ``` 代码块提取
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/g);
  if (codeBlockMatch) {
    for (const block of codeBlockMatch.reverse()) {
      const jsonStr = block.replace(/```(?:json)?\s*\n?/, "").replace(/\n?```$/, "").trim();
      const extracted = extractBalancedJson(jsonStr);
      if (extracted) return extracted;
    }
  }

  // 策略2：查找常见的 JSON 键名模式，从那里开始提取
  const jsonPatterns = [
    /"definitions"\s*:/,
    /"moments"\s*:/,
    /"takeaways"\s*:/,
    /"summary"\s*:/,
    /"highlights"\s*:/,
    /"suggestedQuestions"\s*:/,
  ];

  for (const pattern of jsonPatterns) {
    const match = text.match(pattern);
    if (match) {
      // 从匹配位置向前找到最近的 `{`
      const matchStart = match.index!;
      const beforeMatch = text.slice(0, matchStart);
      const lastBrace = beforeMatch.lastIndexOf("{");
      if (lastBrace !== -1) {
        const extracted = extractBalancedJson(text.slice(lastBrace));
        if (extracted) return extracted;
      }
    }
  }

  // 策略3：从后向前尝试提取最后一个完整的 JSON 对象
  // （最终答案通常在 thinking 的最后部分）
  const reversedText = text.split("").reverse().join("");
  const reversedLastBrace = reversedText.indexOf("}");
  if (reversedLastBrace !== -1) {
    // 从原始文本的末尾向前找到最后一个 `}`
    const lastBraceIdx = text.length - 1 - reversedLastBrace;
    // 向前找到匹配的 `{`
    let depth = 0;
    for (let i = lastBraceIdx; i >= 0; i--) {
      if (text[i] === "}") depth++;
      if (text[i] === "{") depth--;
      if (depth === 0) {
        const candidate = text.slice(i, lastBraceIdx + 1);
        try {
          JSON.parse(candidate);
          return candidate;
        } catch {
          // 继续向前搜索
        }
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
