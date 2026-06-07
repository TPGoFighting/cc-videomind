/**
 * AI 分析质量测试（简化版，直接从 Vercel env 文件读取）
 * 用法：npx tsx scripts/test-ai-quality.ts
 */

import { readFileSync } from "fs";
import { join } from "path";

// 从 .env.production.local 提取环境变量
function getEnv(name: string): string {
  const content = readFileSync(join(process.cwd(), ".env.production.local"), "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (key !== name) continue;
    let value = trimmed.slice(eq + 1).trim();
    // 去除首尾引号
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    // 去除字面 \n（Vercel CLI 的坑）
    value = value.replace(/\\n/g, "").trim();
    return value;
  }
  return "";
}

// ====== 测试字幕 ======
const TRANSCRIPT = [
  { startTime: 0, endTime: 5, text: "大家好，今天我们来聊聊人工智能是如何改变现代医学的。" },
  { startTime: 5, endTime: 12, text: "首先我们要明白一个关键概念：深度学习在医学影像分析中的应用已经超过了人类放射科医生。" },
  { startTime: 12, endTime: 18, text: "2018年，斯坦福大学的一项研究表明，AI算法在识别皮肤癌方面的准确率达到了95%，而人类专家只有86%。" },
  { startTime: 18, endTime: 25, text: "这不是说AI要取代医生，而是成为医生的'第二双眼睛'，帮助他们发现人眼容易遗漏的细节。" },
  { startTime: 25, endTime: 32, text: "在药物研发领域，AI也发挥着越来越重要的作用。传统的药物研发周期通常需要10到15年，花费数十亿美元。" },
  { startTime: 32, endTime: 40, text: "而借助AI技术，研究人员可以在数百万种化合物中快速筛选出有潜力的候选药物，将研发时间缩短到3到5年。" },
  { startTime: 40, endTime: 47, text: "2020年，DeepMind的AlphaFold解决了困扰生物学界50年的蛋白质折叠问题，这是一个里程碑式的突破。" },
  { startTime: 47, endTime: 55, text: "蛋白质折叠问题的解决意味着我们可以更精准地理解疾病机制，设计出更有效的靶向药物。" },
  { startTime: 55, endTime: 62, text: "在临床诊断方面，AI已经开始被用于分析心电图、检测视网膜病变、甚至预测败血症。" },
  { startTime: 62, endTime: 70, text: "谷歌健康开发的一款AI系统可以通过眼底照片，在30秒内检测出糖尿病视网膜病变，准确率超过90%。" },
  { startTime: 70, endTime: 78, text: "这在中低收入国家意义重大，因为那些地区往往缺乏专业的眼科医生，AI可以帮助填补这一空白。" },
  { startTime: 78, endTime: 85, text: "当然，AI在医疗领域的应用也面临诸多挑战。首要问题是数据的隐私和安全性。" },
  { startTime: 85, endTime: 92, text: "医疗数据是最敏感的个人信息之一，如何在保护隐私的前提下训练出有效的AI模型，是一个棘手的问题。" },
  { startTime: 92, endTime: 100, text: "联邦学习是一种新兴的解决方案，它允许多家医院在不共享原始数据的情况下，共同训练AI模型。" },
  { startTime: 100, endTime: 107, text: "另一个挑战是算法偏见。如果训练数据主要来自某一特定人群，AI在其他人种上的表现可能会大打折扣。" },
  { startTime: 107, endTime: 115, text: "2019年的一项研究发现，一款广泛使用的医疗算法对黑人患者存在系统性偏见，因为它将医疗花费作为健康状况的代理指标。" },
  { startTime: 115, endTime: 122, text: "这提醒我们，AI不是魔法，它的好坏完全取决于训练数据的质量和代表性。" },
  { startTime: 122, endTime: 130, text: "在监管层面，各国政府也在积极构建AI医疗器械的审批框架。美国FDA已经批准了超过500个AI医疗设备。" },
  { startTime: 130, endTime: 137, text: "这些获批的设备主要集中在放射科和心脏科，用于辅助诊断和风险评估。" },
  { startTime: 137, endTime: 145, text: "展望未来，AI在医疗领域最令人兴奋的方向之一是'数字孪生'——为每个病人创建一个AI驱动的虚拟副本。" },
  { startTime: 145, endTime: 152, text: "通过数字孪生，医生可以在虚拟环境中测试不同的治疗方案，找到最适合每个患者的个性化治疗路径。" },
  { startTime: 152, endTime: 160, text: "这种方式可以将'试错'从病人身上转移到虚拟模型中，大大提高治疗的安全性和有效性。" },
  { startTime: 160, endTime: 168, text: "另一个趋势是可穿戴设备与AI的结合。Apple Watch和Fitbit等设备已经能够检测心率异常。" },
  { startTime: 168, endTime: 175, text: "配合AI算法，这些设备未来可能提前数小时预警心脏病发作或中风，为抢救争取宝贵时间。" },
  { startTime: 175, endTime: 182, text: "总之，AI正在从根本上改变我们对医疗的认知。它不是替代医生，而是赋能医生，让医疗服务更加精准、高效和普惠。" },
  { startTime: 182, endTime: 190, text: "但我们也需要保持警惕，确保这项技术被负责任地开发和使用，真正造福全人类。" },
];

function formatTs(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function transcriptStr(segments: typeof TRANSCRIPT) {
  return segments.map((s) => `[${formatTs(s.startTime)}-${formatTs(s.endTime)}] ${s.text}`).join("\n");
}

// ====== 当前 Prompt ======
function currentPrompt(title: string, segments: typeof TRANSCRIPT) {
  const schemaExample = {
    summary: "一句话概述视频内容",
    takeaways: ["关键点 1", "关键点 2", "关键点 3"],
    suggestedQuestions: ["问题 1", "问题 2", "问题 3"],
    highlights: [{ startTime: 10.5, endTime: 35.2, title: "亮点标题", quote: "原文引用", reason: "为什么重要" }]
  };
  return [
    "你是 Teach Player，一个严谨的学习助手。",
    "严格基于字幕内容，禁止编造任何引用、观点或时间戳。",
    "",
    "你必须返回如下 JSON 结构（不要添加任何解释、markdown 标记或额外文本）：",
    JSON.stringify(schemaExample, null, 2),
    "",
    "要求：",
    "- summary：1-3 句话概括视频内容",
    "- takeaways：3-8 个关键要点",
    "- suggestedQuestions：3-8 个基于内容的问题",
    "- highlights：5-8 个亮点，每个含 startTime(秒)、endTime(秒)、title、quote(原文引用)、reason(重要性)",
    "- 所有时间戳使用数字秒",
    "",
    `视频标题：${title}`,
    "字幕内容：",
    transcriptStr(segments)
  ].join("\n");
}

// ====== 改进版 Prompt ======
function improvedPrompt(title: string, segments: typeof TRANSCRIPT) {
  const schemaExample = {
    summary: "本视频深入探讨了AI在医学影像、药物研发和临床诊断三大领域的应用。通过斯坦福皮肤癌研究（AI 95% vs 人类86%）和AlphaFold蛋白质折叠突破等具体案例，展示了AI如何超越人类专家。同时讨论了数据隐私、算法偏见等挑战，以及数字孪生、可穿戴设备等未来方向。",
    takeaways: [
      "AI在医学影像分析中已超越人类：斯坦福2018年研究显示，AI识别皮肤癌准确率95%，远超人类专家的86%",
      "AI大幅缩短药物研发周期：从传统的10-15年、数十亿美元，缩短至3-5年，通过快速筛选数百万化合物实现",
      "AlphaFold解决蛋白质折叠问题：DeepMind在2020年攻克了困扰生物学50年的难题，推动精准靶向药物设计",
      "AI在临床诊断中广泛应用：谷歌AI系统可在30秒内通过眼底照片检测糖尿病视网膜病变，准确率超90%",
      "数据隐私是核心挑战：医疗数据高度敏感，联邦学习允许多家医院在不共享原始数据的前提下共同训练模型",
      "算法偏见不容忽视：2019年研究发现某医疗算法对黑人患者存在系统性偏见，因将医疗花费作为健康代理指标",
      "数字孪生是未来方向：为每个病人创建AI虚拟副本，在虚拟环境中测试治疗方案，实现个性化医疗"
    ],
    suggestedQuestions: [
      "AlphaFold是如何解决蛋白质折叠问题的？它对药物研发有什么具体影响？",
      "联邦学习如何在不共享数据的情况下训练AI模型？它的技术原理是什么？",
      "数字孪生在医疗中的具体应用场景有哪些？目前面临哪些技术瓶颈？"
    ],
    highlights: [
      { startTime: 12.0, endTime: 18.0, title: "AI影像诊断超越人类", quote: "AI算法在识别皮肤癌方面的准确率达到了95%，而人类专家只有86%", reason: "用权威研究数据展示了AI相对于人类专家的具体优势" }
    ]
  };
  return [
    "你是一个专业的学习笔记整理助手。你的任务是基于视频字幕，为学习者生成高质量的学习笔记。",
    "",
    "核心原则：",
    "- 所有内容必须严格来自字幕，禁止编造任何信息",
    "- 摘要要有信息量，包含具体话题和关键发现，不能只是泛泛而谈",
    "- 每条要点必须包含具体的数据、案例、人名或因果逻辑，避免空洞的概括",
    "- 亮点要选择真正有信息价值的内容片段",
    "",
    "输出格式（纯 JSON，不要添加任何 markdown 或额外文字）：",
    JSON.stringify(schemaExample, null, 2),
    "",
    `【视频标题】${title}`,
    "",
    "【字幕内容】",
    transcriptStr(segments)
  ].join("\n");
}

// ====== API 调用 ======
async function callApi(prompt: string, label: string) {
  const apiKey = getEnv("AI_API_KEY");
  const baseUrl = getEnv("AI_API_BASE_URL") || "https://api.deepseek.com";
  const model = getEnv("AI_MODEL") || "deepseek-v4-pro";

  console.log(`\n📋 === ${label} ===`);
  console.log(`   Key valid: ${apiKey.startsWith("sk-")} (len=${apiKey.length})`);
  console.log("─".repeat(50));

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "Return only valid JSON. Do not include markdown or extra text." },
        { role: "user", content: prompt }
      ]
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!res.ok) {
    const err = await res.text();
    console.log(`❌ HTTP ${res.status}: ${err.slice(0, 200)}`);
    return;
  }

  const json = await res.json() as { choices: Array<{ message: { content: string } }> };
  const raw = json.choices[0]?.message?.content ?? "";

  try {
    const r = JSON.parse(raw);
    console.log(`\n📝 摘要 (${r.summary?.length ?? 0}字):`);
    console.log(`   ${r.summary}`);
    console.log(`\n📌 要点 (${r.takeaways?.length ?? 0}条):`);
    r.takeaways?.forEach((t: string, i: number) => console.log(`   ${i + 1}. ${t}`));
    console.log(`\n❓ 问题 (${r.suggestedQuestions?.length ?? 0}条):`);
    r.suggestedQuestions?.forEach((q: string, i: number) => console.log(`   ${i + 1}. ${q}`));
    console.log(`\n🔦 亮点 (${r.highlights?.length ?? 0}条):`);
    r.highlights?.slice(0, 3).forEach((h: Record<string, unknown>, i: number) => {
      console.log(`   ${i + 1}. [${h.startTime}s] ${h.title}: ${(h.quote as string)?.slice(0, 60)}...`);
    });
    if (r.highlights?.length > 3) console.log(`   ... 还有 ${r.highlights.length - 3} 条`);
  } catch {
    console.log("原始输出（前 500 字）:");
    console.log(raw.slice(0, 500));
  }
}

async function main() {
  const title = "人工智能如何改变现代医学";

  console.log("=".repeat(50));
  console.log("🧪 AI 分析 Prompt 对比测试");
  console.log(`API: ${getEnv("AI_API_BASE_URL")}`);
  console.log(`Model: ${getEnv("AI_MODEL")}`);
  console.log(`字幕段数: ${TRANSCRIPT.length}`);
  console.log(`\n标题: ${title}`);

  // 测试当前 Prompt
  await callApi(currentPrompt(title, TRANSCRIPT), "当前 Prompt");

  // 测试改进版 Prompt
  await callApi(improvedPrompt(title, TRANSCRIPT), "改进版 Prompt");

  console.log("\n" + "=".repeat(50));
  console.log("测试完成 ✅");
}

main().catch((e) => console.error("测试失败:", e));
