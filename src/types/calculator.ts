/** 数量反推与石油王推算器共用的类型定义。 */

export type RoundingMode = 'truncate' | 'round';

/** 橙 / 紫 / 红 件数及对应估值（游戏内货币单位）。 */
export interface ValueCombo {
  orange: number;
  purple: number;
  red: number;
  value: number;
  /** 格数推断启用时：橙/红总格数（与截断平均一致的最小整数总格）。红为负时 `null`。 */
  orangeGridSlots?: number | null;
  redGridSlots?: number | null;
}

/**
 * 石油王推算器输入。字段多为局内读数；平均值可能为截断或四舍五入后的显示值。
 * 未填的可选信息勿用 0 代替（见 `getEstimatorInput`）。
 */
export interface GameEstimatorInput {
  /** 总藏品数量（技能）；未填表示尚未获知 */
  totalItems?: number;
  wgSlots?: number;
  wgAvg?: number;
  orangeAvg?: number;
  /** 与 `orangeAvg` 同一输入框原文，用于区分 0.9 与 0.90 的截断步长。 */
  orangeAvgStr?: string;
  /** 橙色平均价值（局内显示，多为两位小数四舍五入） */
  orangeAvgValue?: number;
  /** 与 `orangeAvgValue` 同一输入框原文（四舍五入反推时的显示精度）。 */
  orangeAvgValueStr?: string;
  /** 蓝色总数量（道具）；未填表示尚未使用良品存量等 */
  blueCount?: number;
  orangeFixedCount?: number;
  orangeTotalSlots?: number;
  purpleFixedCount?: number;
  purpleTotalSlots?: number;
  purpleAvg?: number;
  /** 与 `purpleAvg` 同一输入框原文。 */
  purpleAvgStr?: string;
  /** 紫色平均价值（局内显示，多为两位小数四舍五入） */
  purpleAvgValue?: number;
  /** 与 `purpleAvgValue` 同一输入框原文。 */
  purpleAvgValueStr?: string;

  /** 目标占比 P/(R+O+P)；`estimateGame` 中缺省 0.66 */
  expectedPurpleRatio?: number;
  /** 目标占比 O/(R+O)；`estimateGame` 中缺省 0.66 */
  expectedOrangeAmongRORatio?: number;

  /** 红色每件单价（普通单位） */
  redUnitValue?: number;
  orangeUnitValue?: number;
  purpleUnitValue?: number;
  /** 格数粗算：每格单价；紫默认 3000 */
  redGridUnitValue?: number;
  orangeGridUnitValue?: number;
  purpleGridUnitValue?: number;

  /** 全藏品总格数（可选）；与 `collectionAvgGridSlots` 二选一，用于与蓝格数平衡推红/橙总格数。 */
  collectionTotalGridSlots?: number;
  /** 全藏品平均格数（可选）；与总格数二选一；需同时有 `totalItems`。 */
  collectionAvgGridSlots?: number;
  collectionAvgGridSlotsStr?: string;
  /** 蓝色藏品总格数（可选）；与 `blueCollectionAvgGridSlots` 二选一。 */
  blueCollectionTotalGridSlots?: number;
  /** 蓝色藏品平均格数（可选）；与蓝总格数二选一；需 `blueCount`。 */
  blueCollectionAvgGridSlots?: number;
  blueCollectionAvgGridSlotsStr?: string;
}

/**
 * 石油王推算器输出。
 * `orangeList` / `purpleList`：有合法组合时取组合投影，否则退回单色候选。
 */
export interface GameEstimatorResult {
  wgCount: number | null;
  remain: number | null;
  /** 无法得精确 R+O+P 时的上界（部分输入场景） */
  remainUpperBound: number | null;
  orangeList: number[];
  purpleList: number[];
  redList: number[];
  minValue: number | null;
  maxValue: number | null;
  expectedValue: number | null;
  expectedCombo: ValueCombo | null;
  /** 格数期望组合（红格中位偏下选取，与件数期望可不一一对应）。 */
  expectedGridCombo: ValueCombo | null;
  /** 估值最低 / 最高组合（件数价值；与格数价值范围已合并入 `minValue`/`maxValue`）。 */
  minValueCombo: ValueCombo | null;
  maxValueCombo: ValueCombo | null;
  /** 有效格数组合中红格最少 / 最多（用于范围展示）。 */
  gridMinCombo: ValueCombo | null;
  gridMaxCombo: ValueCombo | null;
  samples: ValueCombo[];
  /** 按格数价值抽样的代表性格数结果。 */
  gridSamples: ValueCombo[];
  /** 已满足：白绿总占位 +（总藏品总格数 XOR 总藏品平均格数）+（蓝总格数 XOR 蓝平均格数）。 */
  gridSlotInferenceActive: boolean;
  /** 格数粗算（按每格单价）；仅 `gridSlotInferenceActive` 时有意义。 */
  expectedGridValue: number | null;
}
