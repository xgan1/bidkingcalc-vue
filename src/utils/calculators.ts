import type { GameEstimatorInput, GameEstimatorResult, RoundingMode, ValueCombo } from '../types/calculator';

/**
 * 计算器核心算法（纯函数）
 *
 * 设计目标：
 * - 不依赖 DOM / Vue / 浏览器环境（便于单测、复用、迁移）
 * - UI 只是把表单数据转成输入类型，然后调用这里的函数得到结果
 */

const EPSILON = 1e-12;
const RED_VALUE = 150000;
const ORANGE_VALUE = 40000;

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

  const orangeList = getColorCandidates({
    avg: input.orangeAvg,
    fixedCount: input.orangeFixedCount,
    totalSlots: input.orangeTotalSlots,
    remain,
  });

  const purpleList = getColorCandidates({
    avg: input.purpleAvg,
    fixedCount: input.purpleFixedCount,
    totalSlots: input.purpleTotalSlots,
    remain,
  });

  const combos = buildValidCombos(remain, orangeList, purpleList);

  const orangeSet = new Set<number>();
  const purpleSet = new Set<number>();
  const redSet = new Set<number>();

  for (const combo of combos) {
    orangeSet.add(combo.orange);
    purpleSet.add(combo.purple);
    redSet.add(combo.red);
  }

  const sortedCombos = [...combos].sort((a, b) => a.value - b.value);

  return {
    wgCount,
    remain,
    orangeList: [...orangeSet].sort((a, b) => a - b),
    purpleList: [...purpleSet].sort((a, b) => a - b),
    redList: [...redSet].sort((a, b) => a - b),
    minValue: sortedCombos[0]?.value ?? null,
    maxValue: sortedCombos.length > 0 ? sortedCombos[sortedCombos.length - 1].value : null,
    expectedValue: getAverageValue(sortedCombos),
    samples: pickSamples(sortedCombos),
  };
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
  fixedCount?: number;
  totalSlots?: number;
  remain: number | null;
}): number[] {
  /**
   * 生成“某个颜色品质”的候选数量集合：
   * - 如果用户填了 fixedCount：直接锁定为该值
   * - 否则用 avg 进行反推（这里使用截断规则，与原始 HTML 行为一致）
   * - 若提供 totalSlots：用 totalSlots/count 对候选再过滤一遍，进一步缩小范围
   */
  const { avg, fixedCount, totalSlots, remain } = options;

  if (Number.isFinite(fixedCount)) {
    return [fixedCount as number].filter((value) => value >= 0);
  }

  if (!Number.isFinite(avg)) {
    return [];
  }

  const maxCount = Math.max(remain ?? 0, 40);
  let candidates = getPossibleCounts(avg as number, 'truncate', maxCount);

  if (Number.isFinite(remain)) {
    candidates = candidates.filter((value) => value <= (remain as number));
  }

  if (Number.isFinite(totalSlots)) {
    candidates = candidates.filter((count) =>
      matchesTruncatedAverage(avg as number, count, totalSlots as number),
    );
  }

  return candidates;
}

function buildValidCombos(remain: number | null, orangeList: number[], purpleList: number[]): ValueCombo[] {
  /**
   * 枚举所有合法 (橙,紫,红) 组合：
   * - 红由 remain - 橙 - 紫 唯一确定
   * - 若红 < 0 则该组合非法
   *
   * 价值估算：
   * - 红：150,000 / 个
   * - 橙：40,000 / 个
   * - 紫：当前不计价（可按你的游戏理解在未来补充）
   */
  if (!Number.isFinite(remain) || (remain as number) < 0 || orangeList.length === 0 || purpleList.length === 0) {
    return [];
  }

  const combos: ValueCombo[] = [];

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
        value: red * RED_VALUE + orange * ORANGE_VALUE,
      });
    }
  }

  return combos;
}

function getAverageValue(combos: ValueCombo[]): number | null {
  /**
   * 对所有合法组合的价值求算术平均，作为“期望价值”。
   * 注意：这里是“每个合法组合等权”，并没有引入概率模型。
   */
  if (combos.length === 0) {
    return null;
  }

  const totalValue = combos.reduce((sum, item) => sum + item.value, 0);
  return totalValue / combos.length;
}

function pickSamples(sortedCombos: ValueCombo[]): ValueCombo[] {
  /**
   * 从按价值排序后的合法组合中抽取少量样例，方便 UI 展示：
   * - 若组合 <= 5：全展示
   * - 否则：展示 min / 25% / 50% / 75% / max
   */
  if (sortedCombos.length <= 5) {
    return sortedCombos;
  }

  const indexes = [0, 0.25, 0.5, 0.75, 1].map((percent) =>
    Math.min(sortedCombos.length - 1, Math.floor((sortedCombos.length - 1) * percent)),
  );

  const picked = indexes.map((index) => sortedCombos[index]);
  const unique = new Map(picked.map((item) => [`${item.orange}-${item.purple}-${item.red}`, item]));
  return [...unique.values()];
}
