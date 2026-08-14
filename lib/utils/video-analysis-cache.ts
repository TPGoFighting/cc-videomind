type AnalysisCacheRecord = {
  metadata: unknown | null | undefined;
  transcript: unknown | null | undefined;
  analysis: unknown | null | undefined;
};

export function hasReusableVideoAnalysis(
  record: AnalysisCacheRecord | null | undefined,
): record is AnalysisCacheRecord & {
  metadata: NonNullable<AnalysisCacheRecord["metadata"]>;
  transcript: NonNullable<AnalysisCacheRecord["transcript"]>;
  analysis: NonNullable<AnalysisCacheRecord["analysis"]>;
} {
  return Boolean(record?.metadata && record.transcript && record.analysis);
}
