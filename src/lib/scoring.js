/** Re-exports from Phase 2 priority engine — kept for backward compatibility. */
export {
  scoreTask,
  scoreTaskWithBreakdown,
  getUrgency,
  getNextAction,
  getTopActions,
  partitionTasksByTier,
  applyTierToLowScoring,
  FACTOR_KEYS,
  FACTOR_WEIGHTS,
  FACTOR_LABELS,
} from './priorityEngine'
