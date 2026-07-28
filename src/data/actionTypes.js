// Buckets nba_api's free-text ACTION_TYPE into the coarse shot-type filter
// pills. Order matters: checked top to bottom, first match wins.
const RULES = [
  ['dunk', /dunk/i],
  ['layup', /layup/i],
  ['hook', /hook/i],
  ['floater', /floating/i],
  ['fadeaway', /fadeaway|turnaround/i],
];

export const ACTION_TYPE_LABELS = {
  dunk: 'Dunk',
  layup: 'Layup',
  hook: 'Hook',
  floater: 'Floater',
  fadeaway: 'Fadeaway',
  jumper: 'Jumper',
};

export function actionBucketOf(shot) {
  for (const [key, pattern] of RULES) {
    if (pattern.test(shot.actionType)) return key;
  }
  return 'jumper';
}
