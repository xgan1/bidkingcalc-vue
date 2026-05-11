import type { GameEstimatorInput, GameEstimatorResult, RoundingMode, ValueCombo } from '../types/calculator';

/**
 * 计算器核心算法（纯函数）
 *
 * 设计目标：
 * - 不依赖 DOM / Vue / 浏览器环境（便于单测、复用、迁移）
 * - UI 只是把表单数据转成输入类型，然后调用这里的函数得到结果
 */

const EPSILON = 1e-12;
const DEFAULT_RED_VALUE = 150000;
const DEFAULT_ORANGE_VALUE = 30000;
const DEFAULT_PURPLE_VALUE = 10000;

/**
 * 反推“可能的数量 N”
 *
 * 背景：游戏界面展示的是“平均值 A”（通常保留两位小数），但它可能是：
 * - 截断显示：直接舍去到两位小数（例如 0.459 -> 0.45）
 * - 四舍五入显示：四舍五入到两位小数
 *
 * 我们枚举 N=1..max，判断是否存在某个整数“总量 S”（例如总格数）满足显示规则。
 *
 * 判定方法（区间法）：
 * - 截断：真实平均落在 [A, A+0.01) 才会显示为 A
 *        => S / N ∈ [A, A+0.01)
 *        => S ∈ [A*N, (A+0.01)*N)
 * - 四舍五入：真实平均落在 [A-0.005, A+0.005) 显示为 A
 *        => S ∈ [(A-0.005)*N, (A+0.005)*N)
 *
 * 如果该区间中存在整数 S，则 N 是可能的。
 */
export function getPossibleCounts(avg: number, mode: RoundingMode, max = 40): number[] {
  if (!Number.isFinite(avg) || avg < 0 || max < 1) {
    return [];
  }
  // 游戏规则：当平均值明确为 0 时，可能数量就是 0。
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

export function estimateGame(input: GameEstimatorInput): GameEstimatorResult {
  /**
   * “石油王信息推算器”整体流程：
   * 1) 先估算白绿数量（wgCount），并扣除蓝色得到剩余 remain（= 橙+紫+红）
   * 2) 根据橙/紫的平均值分别反推可能的数量集合（若有“确定数量/总格数”会进一步过滤）
   * 3) 枚举 (橙,紫)，由红 = remain - 橙 - 紫 得到所有合法组合
   * 4) 对所有合法组合计算价值（红、橙按固定单价），输出范围/期望/样例组合
   */
  const wgCount = getWgCount(input.wgSlots, input.wgAvg);
  const remain = getRemainCount(input.totalItems, input.blueCount, wgCount);
  const upperBound = wgCount === null ? undefined : Math.max(0, input.totalItems - wgCount);

  const orangeList = getColorCandidates({
    avg: input.orangeAvg,
    avgValue: input.orangeAvgValue,
    fixedCount: input.orangeFixedCount,
    totalSlots: input.orangeTotalSlots,
    remain,
    upperBound,
  });

  const purpleList = getColorCandidates({
    avg: input.purpleAvg,
    avgValue: input.purpleAvgValue,
    fixedCount: input.purpleFixedCount,
    totalSlots: input.purpleTotalSlots,
    remain,
    upperBound,
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
  const expectedCombo = getExpectedCombo(sortedCombos);

  return {
    wgCount,
    remain,
    // 若已能枚举合法组合，则以组合投影结果为准，避免显示组合上不可能的值。
    // 若暂时无法枚举组合（例如只填了第二回合橙色信息），仍先展示单色候选。
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

function uniqueSorted(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

function getBounds(avg: number, mode: RoundingMode, count: number): [number, number] {
  /**
   * 返回总量 S 的合法区间 [low, high)，使得 S/N 在显示规则下会显示为 avg。
   * 注意 high 是开区间端点，因此后续会用 `floor(high - EPSILON)` 处理浮点边界。
   */
  if (mode === 'round') {
    return [(avg - 0.005) * count, (avg + 0.005) * count];
  }

  return [avg * count, (avg + 0.01) * count];
}

function matchesTruncatedAverage(avg: number, count: number, totalSlots: number): boolean {
  /**
   * 过滤规则：当已知“总格数 totalSlots”时，检查 totalSlots/count 的截断显示是否等于 avg。
   *
   * 这里使用 [avg, avg+0.01) 来模拟“两位小数截断显示为 avg”的条件。
   */
  if (!Number.isFinite(avg) || !Number.isFinite(count) || !Number.isFinite(totalSlots) || count <= 0) {
    return false;
  }

  const observed = totalSlots / count;
  return observed >= avg && observed < avg + 0.01;
}

function getWgCount(wgSlots?: number, wgAvg?: number): number | null {
  /**
   * 白绿数量估算：
   * - 输入：白绿总占位 wgSlots、白绿平均格数 wgAvg
   * - 输出：白绿数量约等于 wgSlots / wgAvg
   *
   * 注意：这一步目前沿用原始 HTML 的写法：Math.round。
   * 如果你确认 wgAvg 也属于“截断显示值”，未来可以改为同样使用 `getPossibleCounts` 去反推。
   */
  if (!Number.isFinite(wgSlots) || !Number.isFinite(wgAvg) || wgAvg === 0) {
    return null;
  }

  const slots = wgSlots as number;
  const avg = wgAvg as number;
  return Math.round(slots / avg);
}

function getRemainCount(totalItems: number, blueCount: number, wgCount: number | null): number | null {
  /**
   * 剩余数量 remain = 总藏品 - 白绿 - 蓝
   * remain 会作为 “橙+紫+红” 的总量约束。
   */
  if (!Number.isFinite(totalItems) || totalItems <= 0 || !Number.isFinite(blueCount) || blueCount < 0) {
    return null;
  }

  if (wgCount === null) {
    return null;
  }

  return totalItems - blueCount - wgCount;
}

function getColorCandidates(options: {
  avg?: number;
  avgValue?: number;
  fixedCount?: number;
  totalSlots?: number;
  remain: number | null;
  upperBound?: number;
}): number[] {
  /**
   * 生成“某个颜色品质”的候选数量集合：
   * - 如果用户填了 fixedCount：直接锁定为该值
   * - 否则用 avg 进行反推（这里使用截断规则，与原始 HTML 行为一致）
   * - 若提供 totalSlots：用 totalSlots/count 对候选再过滤一遍，进一步缩小范围
   */
  const { avg, fixedCount, totalSlots, remain, upperBound } = options;

  if (Number.isFinite(fixedCount)) {
    return [fixedCount as number].filter((value) => value >= 0);
  }

  if (!Number.isFinite(avg)) {
    // 允许只靠“平均价值”来反推数量（用四舍五入规则）
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
  /**
   * 枚举所有合法 (橙,紫,红) 组合：
   * - 红由 remain - 橙 - 紫 唯一确定
   * - 若红 < 0 则该组合非法
   *
   * 价值估算：
   * - 红：150,000 / 个
   * - 橙：若提供平均价值则按“平均价值×数量”精确算，否则按 30,000 / 个
   * - 紫：若提供平均价值则按“平均价值×数量”精确算，否则按 10,000 / 个
   */
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

function resolveColorValue(count: number, avgValue: number | undefined, fallbackUnitValue: number): number {
  /**
   * 估值优先级：
   * 1) 若用户提供了平均价值（并且当前组合数量已知），直接按“平均价值 × 数量”计算总价值
   * 2) 否则使用固定单价估算
   */
  if (Number.isFinite(avgValue)) {
    // 平均价值输入按“普通单位”处理（不是“万”），因此不再额外乘 10000。
    return Math.round((avgValue as number) * count);
  }
  return count * fallbackUnitValue;
}

function getExpectedCombo(combos: ValueCombo[]): ValueCombo | null {
  /**
   * 期望价值估计（启发式）：
   * - 目标1：紫色约占(红+橙+紫)的 2/3
   * - 目标2：在(红+橙)中，橙色约占 2/3
   * - 在所有合法组合里，选“最接近上述两个比例目标”的组合，取其价值作为期望估计
   *
   * 这样比“所有组合等权平均”更贴近你给出的经验分布。
   */
  if (combos.length === 0) {
    return null;
  }

  const targetPurpleRatio = 2 / 3;
  const targetOrangeAmongRO = 2 / 3;
  let best: ValueCombo | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const combo of combos) {
    const total = combo.red + combo.orange + combo.purple;
    if (total <= 0) {
      continue;
    }

    const purpleRatio = combo.purple / total;
    const redOrange = combo.red + combo.orange;
    // 红橙都为 0 时，该指标视为最差，避免被误选。
    const orangeAmongRO = redOrange > 0 ? combo.orange / redOrange : -1;

    const score =
      Math.abs(purpleRatio - targetPurpleRatio) * 2 +
      Math.abs(orangeAmongRO - targetOrangeAmongRO);

    if (score < bestScore) {
      bestScore = score;
      best = combo;
      continue;
    }

    // 若接近程度相同，保留先遇到的（在固定输入下结果稳定）。
  }

  return best;
}

function pickSamples(sortedCombos: ValueCombo[]): ValueCombo[] {
  /**
   * 从按价值排序后的合法组合中抽取少量样例，方便 UI 展示：
   * - 若组合 <= 7：全展示
   * - 否则：按价值从低到高等间隔抽样 7 个
   */
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
