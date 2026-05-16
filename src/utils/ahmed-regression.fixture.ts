import type { GameEstimatorInput } from '../types/calculator';

/**
 * 石油王回归用例：总藏品 28、蓝 5、总格 93、蓝均格 2.4、紫均价值 9478.44 等。
 * 见 `ahmed-regression.test.ts`；页面 `initialForm` 与此对齐。
 */
export const AHMED_REGRESSION_INPUT: GameEstimatorInput = {
  totalItems: 28,
  wgAvg: 1.62,
  wgSlots: 13,
  orangeAvg: 6.25,
  orangeAvgStr: '6.25',
  blueCount: 5,
  purpleAvg: 3.55,
  purpleAvgStr: '3.55',
  purpleAvgValue: 9478.44,
  purpleAvgValueStr: '9478.44',
  blueCollectionAvgGridSlots: 2.4,
  blueCollectionAvgGridSlotsStr: '2.4',
  collectionTotalGridSlots: 93,
};

/** 默认每件/每格单价下的期望快照（改默认单价时请同步更新测试）。 */
export const AHMED_REGRESSION_EXPECTED = {
  wgCount: 8,
  remain: 15,
  gridSlotInferenceActive: true,
  orangeList: [4],
  purpleList: [9],
  redList: [2],
  expectedCombo: { orange: 4, purple: 9, red: 2 },
  expectedGridCombo: { orangeGridSlots: 25, redGridSlots: 11 },
  expectedValue: 505306,
  expectedGridValue: 800000,
  minValue: 505306,
  maxValue: 800000,
  gridMinCombo: { orangeGridSlots: 25, redGridSlots: 11 },
  gridMaxCombo: { orangeGridSlots: 25, redGridSlots: 11 },
} as const;
