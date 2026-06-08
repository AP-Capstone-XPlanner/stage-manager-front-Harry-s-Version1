import { STAGE_LIMITS } from '../constants/props.js';
import { STAGE_CURTAIN_HEIGHT_LIMITS } from '../constants/stage.js';

export function clampStageDimension(key, value) {
  const limits = STAGE_LIMITS[key];
  if (!Number.isFinite(value)) return limits.min;
  return Math.min(limits.max, Math.max(limits.min, value));
}

export function clampStageCurtainHeight(value) {
  if (!Number.isFinite(value)) return STAGE_CURTAIN_HEIGHT_LIMITS.default;
  return Math.min(
    STAGE_CURTAIN_HEIGHT_LIMITS.max,
    Math.max(STAGE_CURTAIN_HEIGHT_LIMITS.min, value),
  );
}
