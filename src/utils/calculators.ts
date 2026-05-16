import type { GameEstimatorInput, GameEstimatorResult, RoundingMode, ValueCombo } from '../types/calculator';

/** 纯函数业务逻辑，无 Vue / DOM 依赖。 */

const EPSILON = 1e-12;
const DEFAULT_RED_VALUE = 150000;
const DEFAULT_ORANGE_VALUE = 30000;
const DEFAULT_PURPLE_VALUE = 10000;
const DEFAULT_RED_GRID_UNIT_VALUE = 50000;
const DEFAULT_ORANGE_GRID_UNIT_VALUE = 10000;
const DEFAULT_PURPLE_GRID_UNIT_VALUE = 3000;

export interface GridUnitPrices {
  red: number;
  orange: number;
  purple: number;
}

/** 由推断的红/橙总格数估算格数价值；缺格或红格无效时返回 `null`。 */
export function gridSlotValueFromCombo(combo: ValueCombo, units: GridUnitPrices): number | null {
  const redSlots = combo.redGridSlots;
  const orangeSlots = combo.orangeGridSlots;
  if (
    redSlots === null ||
    redSlots === undefined ||
    orangeSlots === null ||
    orangeSlots === undefined ||
    !Number.isFinite(redSlots) ||
    !Number.isFinite(orangeSlots)
  ) {
    return null;
  }
  return (
    redSlots * units.red +
    orangeSlots * units.orange
  );
}

/** 小数点后「写出来的」位数（含尾随 0），如 0.9→1、0.90→2。无小数点返回 0。 */
function countFractionDigitsAfterDecimalPoint(raw: string): number {
  const t = raw.trim();
  const i = t.indexOf('.');
  if (i < 0) {
    return 0;
  }
  return t.length - i - 1;
}

/**
 * 由输入原文推断「截断/四舍五入到第几位」的宽度：步长 = 10^-k；无小数或小数后为空时按 0.01（与旧版两位一致）。
 */
export function inferTruncationStepFromAverageInputString(raw: string): number {
  const k = countFractionDigitsAfterDecimalPoint(raw);
  if (k <= 0) {
    return 0.01;
  }
  return 10 ** -k;
}

/**
 * 仅写出一位小数时：平均×件数须为整数（十分位运算，避免 0.3×15 等浮点误判）。
 * 例：0.3 只会有 10、20…；0.4 可有 5、10…；0.6 可有 5、10…；0.9 不会有 11。
 */
function passesSingleDecimalWrittenPrecision(count: number, trimmedRaw: string): boolean {
  if (countFractionDigitsAfterDecimalPoint(trimmedRaw) !== 1) {
    return true;
  }
  const parsed = Number.parseFloat(trimmedRaw);
  if (!Number.isFinite(parsed)) {
    return true;
  }
  const tenths = Math.round(parsed * 10);
  return (tenths * count) % 10 === 0;
}

/**
 * 由显示平均值 `avg` 反推可能件数 N：枚举 1…max，存在整数总量 S 使 S/N 在 `mode` 下显示为 `avg`。
 * `avgInputRaw` 定步长（0.9→0.1，0.90→0.01）；仅一位小数时再要求「平均×件数」为整数。
 */
export function getPossibleCounts(
  avg: number,
  mode: RoundingMode,
  max = 40,
  avgInputRaw?: string,
): number[] {
  if (!Number.isFinite(avg) || avg < 0 || max < 1) {
    return [];
  }
  if (avg === 0) {
    return [0];
  }

  const trimmedRaw = avgInputRaw?.trim() ?? '';
  const step =
    trimmedRaw !== '' ? inferTruncationStepFromAverageInputString(trimmedRaw) : 0.01;

  const result: number[] = [];

  for (let count = 1; count <= max; count += 1) {
    if (trimmedRaw !== '' && !passesSingleDecimalWrittenPrecision(count, trimmedRaw)) {
      continue;
    }

    const [low, high] = getBounds(avg, mode, count, step);
    const minTotal = Math.ceil(low);
    const maxTotal = Math.floor(high - EPSILON);

    if (minTotal <= maxTotal) {
      result.push(count);
    }
  }

  return result;
}

/** 与截断显示一致的最小整数总格：S ≥ ceil(N×avg − ε)。 */
function minTruncGridSlotsForCount(count: number, avg?: number): number {
  if (count <= 0 || !Number.isFinite(avg)) {
    return 0;
  }
  return Math.ceil((avg as number) * count - EPSILON);
}

function hasGridSlotBalanceInputs(input: GameEstimatorInput): boolean {
  if (!Number.isFinite(input.wgSlots)) {
    return false;
  }
  const hasTotalSlots = Number.isFinite(input.collectionTotalGridSlots) && (input.collectionTotalGridSlots as number) >= 0;
  const hasTotalAvg =
    Number.isFinite(input.collectionAvgGridSlots) &&
    Number.isFinite(input.totalItems) &&
    (input.totalItems as number) > 0;
  if (hasTotalSlots && hasTotalAvg) {
    return false;
  }
  if (!hasTotalSlots && !hasTotalAvg) {
    return false;
  }

  const hasBlueSlots = Number.isFinite(input.blueCollectionTotalGridSlots) && (input.blueCollectionTotalGridSlots as number) >= 0;
  const hasBlueAvg =
    Number.isFinite(input.blueCollectionAvgGridSlots) &&
    Number.isFinite(input.blueCount) &&
    (input.blueCount as number) >= 0;
  if (hasBlueSlots && hasBlueAvg) {
    return false;
  }
  if (!hasBlueSlots && !hasBlueAvg) {
    return false;
  }

  return true;
}

function resolveTotalCollectionGridSlots(input: GameEstimatorInput): number | null {
  if (Number.isFinite(input.collectionTotalGridSlots)) {
    return Math.round(input.collectionTotalGridSlots as number);
  }
  if (Number.isFinite(input.collectionAvgGridSlots) && Number.isFinite(input.totalItems)) {
    const n = input.totalItems as number;
    const a = input.collectionAvgGridSlots as number;
    return Math.ceil(n * a - EPSILON);
  }
  return null;
}

function resolveBlueCollectionGridSlots(input: GameEstimatorInput): number | null {
  if (Number.isFinite(input.blueCollectionTotalGridSlots)) {
    return Math.round(input.blueCollectionTotalGridSlots as number);
  }
  if (Number.isFinite(input.blueCollectionAvgGridSlots) && Number.isFinite(input.blueCount)) {
    const b = input.blueCount as number;
    const a = input.blueCollectionAvgGridSlots as number;
    return Math.ceil(b * a - EPSILON);
  }
  return null;
}

function enrichComboWithGridSlots(combo: ValueCombo, input: GameEstimatorInput): ValueCombo {
  if (!hasGridSlotBalanceInputs(input)) {
    return combo;
  }
  const totalGrid = resolveTotalCollectionGridSlots(input);
  const blueGrid = resolveBlueCollectionGridSlots(input);
  const wg = input.wgSlots as number;
  if (totalGrid === null || blueGrid === null) {
    return combo;
  }

  const orangeSlots = minTruncGridSlotsForCount(combo.orange, input.orangeAvg);
  const purpleSlots = minTruncGridSlotsForCount(combo.purple, input.purpleAvg);
  const redSlotsRaw = totalGrid - wg - blueGrid - orangeSlots - purpleSlots;

  const redSlots =
    Number.isFinite(redSlotsRaw) && redSlotsRaw >= 0 ? Math.round(redSlotsRaw) : 0;

  return {
    ...combo,
    orangeGridSlots: orangeSlots,
    redGridSlots: redSlots,
  };
}

function isGridComboValidForDisplay(combo: ValueCombo): boolean {
  return (
    combo.redGridSlots !== null &&
    combo.redGridSlots !== undefined &&
    combo.orangeGridSlots !== null &&
    combo.orangeGridSlots !== undefined
  );
}

/** 按红格数取中位偏下（偶数个取较小的一半）。 */
function pickExpectedGridCombo(combos: ValueCombo[]): ValueCombo | null {
  const valid = combos.filter(isGridComboValidForDisplay);
  if (valid.length === 0) {
    return null;
  }

  const byKey = new Map<string, ValueCombo>();
  for (const c of valid) {
    const key = `${c.redGridSlots}-${c.orangeGridSlots}`;
    if (!byKey.has(key)) {
      byKey.set(key, c);
    }
  }
  const unique = [...byKey.values()];
  const redGrids = uniqueSorted(unique.map((c) => c.redGridSlots as number));
  const idx = Math.floor((redGrids.length - 1) / 2);
  const targetRed = redGrids[idx];
  const candidates = unique
    .filter((c) => c.redGridSlots === targetRed)
    .sort((a, b) => (a.orangeGridSlots as number) - (b.orangeGridSlots as number));

  return candidates[0] ?? null;
}

function uniqueGridCombos(combos: ValueCombo[]): ValueCombo[] {
  const map = new Map<string, ValueCombo>();
  for (const c of combos) {
    if (!isGridComboValidForDisplay(c)) {
      continue;
    }
    const key = `${c.redGridSlots}-${c.orangeGridSlots}`;
    map.set(key, c);
  }
  return [...map.values()];
}

function pickGridRangeCombos(combos: ValueCombo[]): {
  min: ValueCombo | null;
  max: ValueCombo | null;
} {
  const unique = uniqueGridCombos(combos);
  if (unique.length === 0) {
    return { min: null, max: null };
  }
  const sorted = [...unique].sort((a, b) => {
    const rd = (a.redGridSlots as number) - (b.redGridSlots as number);
    if (rd !== 0) {
      return rd;
    }
    return (a.orangeGridSlots as number) - (b.orangeGridSlots as number);
  });
  return { min: sorted[0], max: sorted[sorted.length - 1] };
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
    avgInputRaw: input.orangeAvgStr,
    avgValue: input.orangeAvgValue,
    avgValueInputRaw: input.orangeAvgValueStr,
    fixedCount: input.orangeFixedCount,
    totalSlots: input.orangeTotalSlots,
    remain,
    upperBound: colorUpperBound,
  });

  const purpleList = getColorCandidates({
    avg: input.purpleAvg,
    avgInputRaw: input.purpleAvgStr,
    avgValue: input.purpleAvgValue,
    avgValueInputRaw: input.purpleAvgValueStr,
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
  const gridUnits: GridUnitPrices = {
    red: Number.isFinite(input.redGridUnitValue)
      ? (input.redGridUnitValue as number)
      : DEFAULT_RED_GRID_UNIT_VALUE,
    orange: Number.isFinite(input.orangeGridUnitValue)
      ? (input.orangeGridUnitValue as number)
      : DEFAULT_ORANGE_GRID_UNIT_VALUE,
    purple: Number.isFinite(input.purpleGridUnitValue)
      ? (input.purpleGridUnitValue as number)
      : DEFAULT_PURPLE_GRID_UNIT_VALUE,
  };
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

  const sortedCombosPlain = [...combos].sort((a, b) => a.value - b.value);
  const gridSlotInferenceActive = hasGridSlotBalanceInputs(input);
  const sortedCombos = sortedCombosPlain.map((c) => enrichComboWithGridSlots(c, input));
  const expectedCombo = getExpectedCombo(sortedCombos, expectedPurpleRatio, expectedOrangeAmongRORatio);
  const minValueCombo = sortedCombos[0] ?? null;
  const maxValueCombo =
    sortedCombos.length > 0 ? sortedCombos[sortedCombos.length - 1] : null;

  let minValue = sortedCombosPlain[0]?.value ?? null;
  let maxValue =
    sortedCombosPlain.length > 0
      ? sortedCombosPlain[sortedCombosPlain.length - 1].value
      : null;

  let expectedGridCombo: ValueCombo | null = null;
  let expectedGridValue: number | null = null;
  let gridMinCombo: ValueCombo | null = null;
  let gridMaxCombo: ValueCombo | null = null;
  let gridSamples: ValueCombo[] = [];

  if (gridSlotInferenceActive) {
    const combinedValues: number[] = [];
    for (const c of sortedCombosPlain) {
      combinedValues.push(c.value);
    }
    for (const c of sortedCombos) {
      const gv = gridSlotValueFromCombo(c, gridUnits);
      if (gv !== null) {
        combinedValues.push(gv);
      }
    }
    if (combinedValues.length > 0) {
      minValue = Math.min(...combinedValues);
      maxValue = Math.max(...combinedValues);
    }

    const gridRange = pickGridRangeCombos(sortedCombos);
    gridMinCombo = gridRange.min;
    gridMaxCombo = gridRange.max;
    expectedGridCombo = pickExpectedGridCombo(sortedCombos);
    if (expectedGridCombo) {
      expectedGridValue = gridSlotValueFromCombo(expectedGridCombo, gridUnits);
    }

    const uniqueGrids = uniqueGridCombos(sortedCombos).sort(
      (a, b) =>
        (gridSlotValueFromCombo(a, gridUnits) ?? 0) -
        (gridSlotValueFromCombo(b, gridUnits) ?? 0),
    );
    gridSamples = pickSamples(uniqueGrids);
  }

  return {
    wgCount,
    remain,
    remainUpperBound,
    gridSlotInferenceActive,
    // 有组合时列表取组合投影，否则退回单色反推结果。
    orangeList: comboOrangeList.length > 0 ? comboOrangeList : [...orangeList].sort((a, b) => a - b),
    purpleList: comboPurpleList.length > 0 ? comboPurpleList : [...purpleList].sort((a, b) => a - b),
    redList: [...redSet].sort((a, b) => a - b),
    minValue,
    maxValue,
    expectedValue: expectedCombo?.value ?? null,
    expectedCombo,
    expectedGridCombo,
    expectedGridValue,
    minValueCombo,
    maxValueCombo,
    gridMinCombo,
    gridMaxCombo,
    samples: pickSamples(sortedCombosPlain),
    gridSamples,
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

/** 使 S/N 显示为 `avg` 的 S 的区间 [low, high)；`step` 为显示位宽（如 0.01、0.1）。 */
function getBounds(avg: number, mode: RoundingMode, count: number, step: number): [number, number] {
  if (mode === 'round') {
    const half = step / 2;
    return [(avg - half) * count, (avg + half) * count];
  }

  return [avg * count, (avg + step) * count];
}

/** totalSlots/count ∈ [avg, avg+step) 时与「按 step 宽度截断」的显示一致。 */
function matchesTruncatedAverage(avg: number, count: number, totalSlots: number, step: number): boolean {
  if (!Number.isFinite(avg) || !Number.isFinite(count) || !Number.isFinite(totalSlots) || count <= 0) {
    return false;
  }

  const observed = totalSlots / count;
  return observed >= avg && observed < avg + step;
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
  avgInputRaw?: string;
  avgValue?: number;
  avgValueInputRaw?: string;
  fixedCount?: number;
  totalSlots?: number;
  remain: number | null;
  upperBound?: number;
}): number[] {
  const { avg, avgInputRaw, fixedCount, totalSlots, remain, upperBound } = options;

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
    candidates = getPossibleCounts(avg as number, 'truncate', maxCount, avgInputRaw);
  }

  if (Number.isFinite(options.avgValue)) {
    const byValue = getPossibleCounts(
      options.avgValue as number,
      'round',
      maxCount,
      options.avgValueInputRaw,
    );
    candidates = candidates.length === 0 ? byValue : candidates.filter((v) => byValue.includes(v));
  }

  if (Number.isFinite(remain)) {
    candidates = candidates.filter((value) => value <= (remain as number));
  }
  if (Number.isFinite(upperBound)) {
    candidates = candidates.filter((value) => value <= (upperBound as number));
  }

  if (Number.isFinite(avg) && Number.isFinite(totalSlots)) {
    const step =
      avgInputRaw !== undefined && avgInputRaw.trim() !== ''
        ? inferTruncationStepFromAverageInputString(avgInputRaw)
        : 0.01;
    candidates = candidates.filter((count) =>
      matchesTruncatedAverage(avg as number, count, totalSlots as number, step),
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
