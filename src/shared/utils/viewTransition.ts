import { readReducedMotionPreference, resolveReducedMotion } from './a11yUtils';

export function canAnimateViewTransition(): boolean {
  return (
    typeof document !== 'undefined' &&
    'startViewTransition' in document &&
    !resolveReducedMotion(readReducedMotionPreference())
  );
}
