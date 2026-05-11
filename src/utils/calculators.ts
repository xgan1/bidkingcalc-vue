import type { GameEstimatorInput, GameEstimatorResult, RoundingMode, ValueCombo } from '../types/calculator';

/** 纯函数业务逻辑，无 Vue / DOM 依赖。 */

const EPSILON = 1e-12;
const DEFAULT_RED_VALUE = 150000;
const DEFAULT_ORANGE_VALUE = 30000;
const DEFAULT_PURPLE_VALUE = 10000;

/**
 * 由显示平均值 `avg` 反推可能件数 N：存在整数总量 S 使 S/N 在 `mode` 下显示为 `avg`。
 * truncate：S/N ∈ [avg, avg+0.01)；round：按两位半上舍入反推。
 */
export function getPossibleCounts(avg: number, mode: RoundingMode, max = 40): number[] {
  if (!Number.isFinite(avg) || avg < 0 || max < 1) {
    return [];
  }
  if (avg === 0) {
    return [0];
  }

  const result: number[] = [];

  for (let count = 1; count <= max; count += 1) {
    const [low, high] = getBounds(avg, mode, count);
    const minTotal = Math.ceil(low);
    const maxTotal = Math.floor(high - EPSILON);

    if (minTotal <= maxTotal) {
      result.push(count);
    }
  }

  return result;
}

/** 石油王：白绿件数、橙紫红余量、各档候选与估值统计；支持分步填写。 */
export function estimateGame(input: GameEstimatorInput): GameEstimatorResult {
  const totalItems = normalizePositiveInt(input.totalItems);
  const blueCount = normalizeNonNegativeInt(input.blueCount);

  const wgCount = getWgCount(input.wgSlots, input.wgAvg);
  const remain = getRemainCount(totalItems, blueCount, wgCount);
  const remainUpperBound = getRemainUpperBound(totalItems, blueCount, wgCount);

  const colorUpperBound = getColorCountUpperBound(totalItems, blueCount, wgCount);

  const DEFAULT_EXPECTED_RATIO = 0.66;
  const expectedPurpleRatio = Number.isFinite(input.expectedPurpleRatio) ? (input.expectedPurpleRatio as number) : DEFAULT_EXPECTED_RATIO;
  const expectedOrangeAmongRORatio = Number.isFinite(input.expectedOrangeAmongRORatio)
    ? (input.expectedOrangeAmongRORatio as number)
    : DEFAULT_EXPECTED_RATIO;

  const orangeList = getColorCandidates({
    avg: input.orangeAvg,
    avgValue: input.orangeAvgValue,
    fixedCount: input.orangeFixedCount,
    totalSlots: input.orangeTotalSlots,
    remain,
    upperBound: colorUpperBound,
  });

  const purpleList = getColorCandidates({
    avg: input.purpleAvg,
    avgValue: input.purpleAvgValue,
    fixedCount: input.purpleFixedCount,
    totalSlots: input.purpleTotalSlots,
    remain,
    upperBound: colorUpperBound,
  });

  const redUnitValue = Number.isFinite(input.redUnitValue) ? (input.redUnitValue as number) : DEFAULT_RED_VALUE;
  const orangeUnitValue = Number.isFinite(input.orangeUnitValue)
    ? (input.orangeUnitValue as number)
    : DEFAULT_ORANGE_VALUE;
  const purpleUnitValue = Number.isFinite(input.purpleUnitValue)
    ? (input.purpleUnitValue as number)
    : DEFAULT_PURPLE_VALUE;
  const combos = buildValidCombos(
    remain,
    orangeList,
    purpleList,
    {
      orangeAvgValue: input.orangeAvgValue,
      purpleAvgValue: input.purpleAvgValue,
      redUnitValue,
      orangeUnitValue,
      purpleUnitValue,
    },
  );

  const comboOrangeList = uniqueSorted(combos.map((combo) => combo.orange));
  const comboPurpleList = uniqueSorted(combos.map((combo) => combo.purple));
  const redSet = new Set<number>();

  for (const combo of combos) {
    redSet.add(combo.red);
  }

  const sortedCombos = [...combos].sort((a, b) => a.value - b.value);
  const expectedCombo = getExpectedCombo(sortedCombos, expectedPurpleRatio, expectedOrangeAmongRORatio);

  return {
    wgCount,
    remain,
    remainUpperBound,
    // 有组合时列表取组合投影，否则退回单色反推结果。
    orangeList: comboOrangeList.length > 0 ? comboOrangeList : [...orangeList].sort((a, b) => a - b),
    purpleList: comboPurpleList.length > 0 ? comboPurpleList : [...purpleList].sort((a, b) => a - b),
    redList: [...redSet].sort((a, b) => a - b),
    minValue: sortedCombos[0]?.value ?? null,
    maxValue: sortedCombos.length > 0 ? sortedCombos[sortedCombos.length - 1].value : null,
    expectedValue: expectedCombo?.value ?? null,
    expectedCombo,
    samples: pickSamples(sortedCombos),
  };
}

function normalizePositiveInt(value: number | undefined): number | undefined {
  if (!Number.isFinite(value) || (value as number) <= 0) {
    return undefined;
  }
  return Math.trunc(value as number);
}

function normalizeNonNegativeInt(value: number | undefined): number | undefined {
  if (!Number.isFinite(value) || (value as number) < 0) {
    return undefined;
  }
  return Math.trunc(value as number);
}

/** 单色候选上界：已知白绿时为 T−WG；仅知蓝时为 T−B。 */
function getColorCountUpperBound(
  totalItems: number | undefined,
  blueCount: number | undefined,
  wgCount: number | null,
): number | undefined {
  if (wgCount !== null && totalItems !== undefined) {
    return Math.max(0, totalItems - wgCount);
  }
  if (wgCount === null && totalItems !== undefined && blueCount !== undefined) {
    return Math.max(0, totalItems - blueCount);
  }
  return undefined;
}

/** `remain` 不可算时给 UI 的上界：仅 (T,B) 或已知 WG 但未填蓝。 */
function getRemainUpperBound(
  totalItems: number | undefined,
  blueCount: number | undefined,
  wgCount: number | null,
): number | null {
  if (totalItems === undefined) {
    return null;
  }
  if (wgCount === null && blueCount !== undefined) {
    return Math.max(0, totalItems - blueCount);
  }
  if (wgCount !== null && blueCount === undefined) {
    return Math.max(0, totalItems - wgCount);
  }
  return null;
}

function uniqueSorted(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

/** 使 S/N 显示为 `avg` 的 S 的区间 [low, high)；截断分支 high 为开区间端点。 */
function getBounds(avg: number, mode: RoundingMode, count: number): [number, number] {
  if (mode === 'round') {
    return [(avg - 0.005) * count, (avg + 0.005) * count];
  }

  return [avg * count, (avg + 0.01) * count];
}

/** totalSlots/count ∈ [avg, avg+0.01) 时与两位截断显示一致。 */
function matchesTruncatedAverage(avg: number, count: number, totalSlots: number): boolean {
  if (!Number.isFinite(avg) || !Number.isFinite(count) || !Number.isFinite(totalSlots) || count <= 0) {
    return false;
  }

  const observed = totalSlots / count;
  return observed >= avg && observed < avg + 0.01;
}

/** 白绿件数：round(wgSlots / wgAvg)，与早期静态页一致。 */
function getWgCount(wgSlots?: number, wgAvg?: number): number | null {
  if (!Number.isFinite(wgSlots) || !Number.isFinite(wgAvg) || wgAvg === 0) {
    return null;
  }

  const slots = wgSlots as number;
  const avg = wgAvg as number;
  return Math.round(slots / avg);
}

/** R+O+P = 总藏品 − 蓝 − 白绿；三者齐全时返回，否则 null。 */
function getRemainCount(
  totalItems: number | undefined,
  blueCount: number | undefined,
  wgCount: number | null,
): number | null {
  if (totalItems === undefined || blueCount === undefined) {
    return null;
  }

  if (wgCount === null) {
    return null;
  }

  return totalItems - blueCount - wgCount;
}

/**
 * 单色候选：fixedCount 优先；否则 avg 用截断反推，avgValue 用四舍五入反推后取交；
 * 与 remain、upperBound 求交；给定 totalSlots 时用截断平均再过滤。
 */
function getColorCandidates(options: {
  avg?: number;
  avgValue?: number;
  fixedCount?: number;
  totalSlots?: number;
  remain: number | null;
  upperBound?: number;
}): number[] {
  const { avg, fixedCount, totalSlots, remain, upperBound } = options;

  if (Number.isFinite(fixedCount)) {
    return [fixedCount as number].filter((value) => value >= 0);
  }

  if (!Number.isFinite(avg)) {
    if (!Number.isFinite(options.avgValue)) {
      return [];
    }
  }

  const maxCount = Math.max(remain ?? 0, upperBound ?? 0, 40);
  let candidates: number[] = [];

  if (Number.isFinite(avg)) {
    candidates = getPossibleCounts(avg as number, 'truncate', maxCount);
  }

  if (Number.isFinite(options.avgValue)) {
    const byValue = getPossibleCounts(options.avgValue as number, 'round', maxCount);
    candidates = candidates.length === 0 ? byValue : candidates.filter((v) => byValue.includes(v));
  }

  if (Number.isFinite(remain)) {
    candidates = candidates.filter((value) => value <= (remain as number));
  }
  if (Number.isFinite(upperBound)) {
    candidates = candidates.filter((value) => value <= (upperBound as number));
  }

  if (Number.isFinite(avg) && Number.isFinite(totalSlots)) {
    candidates = candidates.filter((count) =>
      matchesTruncatedAverage(avg as number, count, totalSlots as number),
    );
  }

  return candidates;
}

/** 枚举合法 (O,P)，red = remain−O−P；估值见 `resolveColorValue`。 */
function buildValidCombos(
  remain: number | null,
  orangeList: number[],
  purpleList: number[],
  options: {
    orangeAvgValue?: number;
    purpleAvgValue?: number;
    redUnitValue: number;
    orangeUnitValue: number;
    purpleUnitValue: number;
  },
): ValueCombo[] {
  if (!Number.isFinite(remain) || (remain as number) < 0 || orangeList.length === 0 || purpleList.length === 0) {
    return [];
  }

  const combos: ValueCombo[] = [];

  const { orangeAvgValue, purpleAvgValue, redUnitValue, orangeUnitValue, purpleUnitValue } = options;

  for (const orange of orangeList) {
    for (const purple of purpleList) {
      const red = (remain as number) - orange - purple;
      if (red < 0) {
        continue;
      }

      combos.push({
        orange,
        purple,
        red,
        value:
          red * redUnitValue +
          resolveColorValue(orange, orangeAvgValue, orangeUnitValue) +
          resolveColorValue(purple, purpleAvgValue, purpleUnitValue),
      });
    }
  }

  return combos;
}

/** 有平均价值用 avgValue×count，否则用单价×count。 */
function resolveColorValue(count: number, avgValue: number | undefined, fallbackUnitValue: number): number {
  if (Number.isFinite(avgValue)) {
    return Math.round((avgValue as number) * count);
  }
  return count * fallbackUnitValue;
}

/**
 * 启发式期望：最小化 |P/(R+O+P)−目标1|×2 + |O/(R+O)−目标2|；目标缺省 0.66；平局取先出现者。
 */
function getExpectedCombo(
  combos: ValueCombo[],
  expectedPurpleRatio: number,
  expectedOrangeAmongRORatio: number,
): ValueCombo | null {
  if (combos.length === 0) {
    return null;
  }

  let best: ValueCombo | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const combo of combos) {
    const total = combo.red + combo.orange + combo.purple;
    if (total <= 0) {
      continue;
    }

    const purpleRatio = combo.purple / total;
    const redOrange = combo.red + combo.orange;
    const orangeAmongRO = redOrange > 0 ? combo.orange / redOrange : -1;

    const score =
      Math.abs(purpleRatio - expectedPurpleRatio) * 2 + Math.abs(orangeAmongRO - expectedOrangeAmongRORatio);

    if (score < bestScore) {
      bestScore = score;
      best = combo;
      continue;
    }
  }

  return best;
}

/** 按估值排序后等距抽样，最多 7 条。 */
function pickSamples(sortedCombos: ValueCombo[]): ValueCombo[] {
  if (sortedCombos.length <= 7) {
    return sortedCombos;
  }

  const indexes = [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1].map((percent) =>
    Math.min(sortedCombos.length - 1, Math.floor((sortedCombos.length - 1) * percent)),
  );

  const picked = indexes.map((index) => sortedCombos[index]);
  const unique = new Map(picked.map((item) => [`${item.orange}-${item.purple}-${item.red}`, item]));
  return [...unique.values()];
}
