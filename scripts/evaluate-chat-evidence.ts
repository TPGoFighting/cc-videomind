import { getAiProvider } from "@/lib/ai/provider";
import { evaluateChatAnswerFixture } from "@/lib/product/chat-answer-evaluation";
import {
  allowsLiveChatEvaluation,
  LIVE_CHAT_EVALUATION_FIXTURES,
} from "@/lib/product/live-chat-evaluation";
import { selectChatEvidence, validateChatCitations } from "@/lib/product/chat-evidence";

type EvaluationResult = {
  id: string;
  passed: boolean;
  issueCodes: string[];
  jsonParseMode?: string;
  citationNormalized?: boolean;
};

function issueCode(issue: string) {
  return issue.split(":", 1)[0];
}

async function main() {
  if (!allowsLiveChatEvaluation(process.argv.slice(2))) {
    console.error("Refusing to call an AI provider. Re-run with --allow-network after configuring a non-production evaluation credential.");
    process.exitCode = 2;
    return;
  }

  if (!process.env.AI_API_KEY || !process.env.AI_PROVIDER) {
    console.error("AI_PROVIDER and AI_API_KEY must be configured for a live evaluation run.");
    process.exitCode = 2;
    return;
  }

  const provider = await getAiProvider();
  const results: EvaluationResult[] = [];

  for (const fixture of LIVE_CHAT_EVALUATION_FIXTURES) {
    const evidence = selectChatEvidence(fixture.question, fixture.transcript);
    if (!evidence.found) {
      results.push({ id: fixture.id, passed: false, issueCodes: ["evidence_not_found"] });
      continue;
    }

    try {
      const answerWithDiagnostics = await provider.answerQuestion({
        question: fixture.question,
        transcript: evidence.segments,
      });
      const { diagnostics, ...answer } = answerWithDiagnostics;
      const citations = validateChatCitations(answer.citations, evidence.segments);
      const verifiedAnswer = citations.length > 0
        ? { ...answer, citations }
        : { answer: "模型没有返回可核验的引用。", citations: [] };
      const evaluation = evaluateChatAnswerFixture(verifiedAnswer, fixture.transcript, fixture.expected);
      results.push({
        id: fixture.id,
        passed: evaluation.passed,
        issueCodes: evaluation.issues.map(issueCode),
        jsonParseMode: diagnostics.jsonParseMode,
        citationNormalized: diagnostics.citationNormalized,
      });
    } catch {
      results.push({ id: fixture.id, passed: false, issueCodes: ["provider_error"] });
    }
  }

  const passed = results.filter((result) => result.passed).length;
  console.log(JSON.stringify({
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  }));
  if (passed !== results.length) process.exitCode = 1;
}

void main();
