import { validateChatCitations } from "@/lib/product/chat-evidence";
import type { ChatAnswer, TranscriptSegment } from "@/lib/types";

type GroundedAnswerFixture = {
  shouldRefuse?: false;
  answerMustContain: string[];
  citationMustContain: string[];
};

type RefusalFixture = {
  shouldRefuse: true;
  refusalMustContain: string;
};

export type ChatAnswerFixture = GroundedAnswerFixture | RefusalFixture;

export type ChatAnswerEvaluation = {
  passed: boolean;
  issues: string[];
};

function includesNormalized(value: string, expected: string) {
  return value.toLowerCase().includes(expected.toLowerCase());
}

/**
 * Evaluates a saved model answer against a hand-authored, transcript-backed fixture.
 * This is a regression contract, not a substitute for semantic model evaluation.
 */
export function evaluateChatAnswerFixture(
  answer: ChatAnswer,
  transcript: TranscriptSegment[],
  fixture: ChatAnswerFixture,
): ChatAnswerEvaluation {
  const issues: string[] = [];

  if (fixture.shouldRefuse) {
    if (!includesNormalized(answer.answer, fixture.refusalMustContain)) {
      issues.push(`refusal_missing:${fixture.refusalMustContain}`);
    }
    if (answer.citations.length > 0) {
      issues.push("refusal_has_citations");
    }
    return { passed: issues.length === 0, issues };
  }

  for (const requiredText of fixture.answerMustContain) {
    if (!includesNormalized(answer.answer, requiredText)) {
      issues.push(`answer_missing:${requiredText}`);
    }
  }

  const validatedCitations = validateChatCitations(answer.citations, transcript);
  if (validatedCitations.length !== answer.citations.length) {
    issues.push("citation_not_in_transcript");
  }
  for (const requiredText of fixture.citationMustContain) {
    if (!validatedCitations.some((citation) => includesNormalized(citation.quote, requiredText))) {
      issues.push(`citation_missing:${requiredText}`);
    }
  }

  return { passed: issues.length === 0, issues };
}
