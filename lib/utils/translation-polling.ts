export {
  getTranslationPollDelay,
  isRetryableTranslationFailure,
  shouldContinueTranslation,
  TRANSLATION_POLL_INITIAL_DELAY_MS,
  TRANSLATION_POLL_MAX_ATTEMPTS,
  TRANSLATION_POLL_MAX_DELAY_MS,
  type TranslationPollSignal,
} from "../../packages/shared/src/translation-polling";
