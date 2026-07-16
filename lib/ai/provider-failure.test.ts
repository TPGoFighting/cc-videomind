import assert from "node:assert/strict";
import test from "node:test";
import { ExternalServiceError } from "@/lib/utils/http";
import { getAiProviderFailure } from "@/lib/ai/provider-failure";

test("identifies an AI provider payment rejection", () => {
  const failure = getAiProviderFailure(
    new ExternalServiceError("AI provider (Anthropic) returned 402", "AI provider (Anthropic)", 402),
  );

  assert.deepEqual(failure, {
    code: "ai_quota_exhausted",
    message: "AI 服务额度不足。请为当前 AI 账户充值，或在服务器中配置可用的备用模型后重试。",
    status: 402,
  });
});

test("identifies an AI provider credential rejection", () => {
  const failure = getAiProviderFailure(
    new ExternalServiceError("AI provider returned 401", "AI provider", 401),
  );

  assert.equal(failure?.code, "ai_credentials_invalid");
  assert.equal(failure?.status, 401);
});

test("does not misclassify non-AI service failures", () => {
  const failure = getAiProviderFailure(
    new ExternalServiceError("YouTube returned 429", "YouTube", 429),
  );

  assert.equal(failure, null);
});
