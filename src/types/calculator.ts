/** 数量反推与石油王推算器共用的类型定义。 */

export type RoundingMode = 'truncate' | 'round';

/** 橙 / 紫 / 红 件数及对应估值（游戏内货币单位）。 */
export interface ValueCombo {
  orange: number;
  purple: number;
  red: number;
  value: number;
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
  /** 橙色平均价值（局内显示，多为两位小数四舍五入） */
  orangeAvgValue?: number;
  /** 蓝色总数量（道具）；未填表示尚未使用良品存量等 */
  blueCount?: number;
  orangeFixedCount?: number;
  orangeTotalSlots?: number;
  purpleFixedCount?: number;
  purpleTotalSlots?: number;
  purpleAvg?: number;
  /** 紫色平均价值（局内显示，多为两位小数四舍五入） */
  purpleAvgValue?: number;

  /** 目标占比 P/(R+O+P)；`estimateGame` 中缺省 0.66 */
  expectedPurpleRatio?: number;
  /** 目标占比 O/(R+O)；`estimateGame` 中缺省 0.66 */
  expectedOrangeAmongRORatio?: number;

  redUnitValue?: number;
  orangeUnitValue?: number;
  purpleUnitValue?: number;
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
  samples: ValueCombo[];
}
