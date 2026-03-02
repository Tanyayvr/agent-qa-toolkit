// apps/evaluator/src/evaluator.ts
// Thin public entrypoint: runtime pipeline lives in evaluatorPipeline.ts.

export {
  runEvaluator,
  parseRateThreshold,
  isWeakExpected,
  deriveCaseStatus,
  extractTraceAnchor,
} from "./evaluatorPipeline";
