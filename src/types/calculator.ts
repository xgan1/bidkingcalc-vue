/**
 * 计算器业务类型定义（纯类型文件）
 *
 * 这个项目把“算法”和“UI”分离：
 * - `src/utils/calculators.ts`：只放纯函数（业务算法）
 * - `src/components/*`：只负责表单/展示（Vue 组件）
 * - 本文件：集中管理算法输入输出的 TypeScript 类型，方便维护与复用
 */

export type RoundingMode = 'truncate' | 'round';

/**
 * 一个合法组合（橙/紫/红）以及该组合对应的价值估算。
 */
export interface ValueCombo {
  orange: number;
  purple: number;
  red: number;
  value: number;
}

/**
 * “石油王信息推算器”输入
 *
 * 注意：这些字段大多来自用户在游戏界面里看到的“平均格数”等信息，
 * 其中平均值通常是“显示值”（可能经过截断或四舍五入）。
 */
export interface GameEstimatorInput {
  totalItems: number;
  wgSlots?: number;
  wgAvg?: number;
  orangeAvg?: number;
  /** 橙色平均价值（游戏显示值，通常两位小数四舍五入） */
  orangeAvgValue?: number;
  blueCount: number;
  orangeFixedCount?: number;
  orangeTotalSlots?: number;
  purpleFixedCount?: number;
  purpleTotalSlots?: number;
  purpleAvg?: number;
  /** 紫色平均价值（游戏显示值，通常两位小数四舍五入） */
  purpleAvgValue?: number;
  /** 红色单价（普通单位） */
  redUnitValue?: number;
  /** 橙色单价（普通单位） */
  orangeUnitValue?: number;
  /** 紫色单价（普通单位） */
  purpleUnitValue?: number;
}

/**
 * “石油王信息推算器”输出
 *
 * - `wgCount/remain`：若输入不足会是 null
 * - `orangeList/purpleList/redList`：满足约束条件的可能数量集合
 * - `min/max/expected`：对所有合法组合做价值估算后的统计结果
 */
export interface GameEstimatorResult {
  wgCount: number | null;
  remain: number | null;
  orangeList: number[];
  purpleList: number[];
  redList: number[];
  minValue: number | null;
  maxValue: number | null;
  expectedValue: number | null;
  expectedCombo: ValueCombo | null;
  samples: ValueCombo[];
}
