<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import type { GameEstimatorInput, ValueCombo } from '../types/calculator';
import { estimateGame, gridSlotValueFromCombo } from '../utils/calculators';
import {
  isOptionalDecimalString,
  isOptionalNonNegativeIntString,
  isRequiredNonNegativeIntString,
} from '../utils/numericForm';

/** 石油王：字符串表单 → `GameEstimatorInput` → `estimateGame` 展示。 */

type FormState = Record<string, string>;
const DEFAULT_RED_UNIT_VALUE = 150000;
const DEFAULT_ORANGE_UNIT_VALUE = 30000;
const DEFAULT_PURPLE_UNIT_VALUE = 10000;
const DEFAULT_RED_GRID_UNIT_VALUE = 50000;
const DEFAULT_ORANGE_GRID_UNIT_VALUE = 10000;
const DEFAULT_PURPLE_GRID_UNIT_VALUE = 3000;
const DEFAULT_EXPECTED_RATIO = 0.66;

/** 回归测试用例（别墅区常见一局）；亦作页面默认演示数据。 */
const initialForm: FormState = {
  totalItems: '28',
  wgSlots: '13',
  wgAvg: '1.62',
  orangeAvg: '6.25',
  orangeAvgValue: '',
  blueCount: '5',
  orangeFixedCount: '',
  orangeTotalSlots: '',
  purpleFixedCount: '',
  purpleTotalSlots: '',
  purpleAvg: '3.55',
  purpleAvgValue: '9478.44',
  collectionTotalGridSlots: '93',
  collectionAvgGrid: '',
  blueCollectionTotalGridSlots: '',
  blueCollectionAvgGrid: '2.4',
  redUnitValue: `${DEFAULT_RED_UNIT_VALUE}`,
  orangeUnitValue: `${DEFAULT_ORANGE_UNIT_VALUE}`,
  purpleUnitValue: `${DEFAULT_PURPLE_UNIT_VALUE}`,
  redGridUnitValue: `${DEFAULT_RED_GRID_UNIT_VALUE}`,
  orangeGridUnitValue: `${DEFAULT_ORANGE_GRID_UNIT_VALUE}`,
  purpleGridUnitValue: `${DEFAULT_PURPLE_GRID_UNIT_VALUE}`,
  expectedPurpleRatio: `${DEFAULT_EXPECTED_RATIO}`,
  expectedOrangeAmongRORatio: `${DEFAULT_EXPECTED_RATIO}`,
};

const form = reactive<FormState>({ ...initialForm });

/** 「第四回合（可选）」格数推断区默认折叠。 */
const otherOptionsOpen = ref(false);

const hasOtherGridOptionsFilled = computed(() =>
  (
    [
      form.collectionTotalGridSlots,
      form.collectionAvgGrid,
      form.blueCollectionTotalGridSlots,
      form.blueCollectionAvgGrid,
    ] as const
  ).some((s) => s.trim() !== ''),
);

/** 清零模板：局内读数字段清空；每件/每格单价与期望占比保留当前值（不随清零重置）。 */
const clearedForm: FormState = {
  totalItems: '',
  wgSlots: '',
  wgAvg: '',
  orangeAvg: '',
  orangeAvgValue: '',
  blueCount: '',
  orangeFixedCount: '',
  orangeTotalSlots: '',
  purpleFixedCount: '',
  purpleTotalSlots: '',
  purpleAvg: '',
  purpleAvgValue: '',
  collectionTotalGridSlots: '',
  collectionAvgGrid: '',
  blueCollectionTotalGridSlots: '',
  blueCollectionAvgGrid: '',
};

const result = computed(() => estimateGame(getEstimatorInput(form)));

const gridUnitPrices = computed(() => ({
  red: toInt(form.redGridUnitValue) ?? DEFAULT_RED_GRID_UNIT_VALUE,
  orange: toInt(form.orangeGridUnitValue) ?? DEFAULT_ORANGE_GRID_UNIT_VALUE,
  purple: toInt(form.purpleGridUnitValue) ?? DEFAULT_PURPLE_GRID_UNIT_VALUE,
}));

function formatGridSampleWan(item: ValueCombo): string {
  return formatWan(gridSlotValueFromCombo(item, gridUnitPrices.value));
}
const remainDisplay = computed(() => {
  if (result.value.remain !== null) {
    return `${result.value.remain}`;
  }
  if (result.value.remainUpperBound !== null) {
    return `至多 ${result.value.remainUpperBound}（上界）`;
  }
  return '未知';
});

/** 无估值区间时不展示；未填第四回合时只要有件数估值就显示范围（与改版前一致，不因只有一种组合而隐藏）。 */
const hideValueRangeLine = computed(() => {
  const r = result.value;
  if (r.minValue === null || r.maxValue === null) {
    return true;
  }
  if (!r.gridSlotInferenceActive) {
    return false;
  }
  return r.minValue === r.maxValue;
});

function combosSameCount(a: ValueCombo, b: ValueCombo): boolean {
  return a.red === b.red && a.orange === b.orange && a.purple === b.purple;
}

const valueRangeCountsDiffer = computed(() => {
  const min = result.value.minValueCombo;
  const max = result.value.maxValueCombo;
  if (!min || !max) {
    return false;
  }
  return !combosSameCount(min, max);
});

const gridRangeSlotsDiffer = computed(() => {
  const min = result.value.gridMinCombo;
  const max = result.value.gridMaxCombo;
  if (!min || !max) {
    return false;
  }
  return (
    min.redGridSlots !== max.redGridSlots || min.orangeGridSlots !== max.orangeGridSlots
  );
});

const FIELD_LABELS = {
  totalItems: '总藏品数量（技能）',
  wgSlots: '白绿总占位（道具）',
  wgAvg: '白绿平均格数（道具）',
  orangeAvg: '橙色平均格数（技能）',
  orangeAvgValue: '橙色平均价值（可选）',
  blueCount: '蓝色总数量（道具）',
  purpleAvg: '紫色平均格数（技能）',
  purpleAvgValue: '紫色平均价值（可选）',
  orangeFixedCount: '橙色确定数量（可选）',
  orangeTotalSlots: '橙色总格数（可选）',
  purpleFixedCount: '紫色确定数量（可选）',
  purpleTotalSlots: '紫色总格数（可选）',
  redUnitValue: '红色每件单价',
  orangeUnitValue: '橙色每件单价',
  purpleUnitValue: '紫色每件单价',
  redGridUnitValue: '红色每格单价',
  orangeGridUnitValue: '橙色每格单价',
  purpleGridUnitValue: '紫色每格单价',
  expectedPurpleRatio: '紫占比目标',
  expectedOrangeAmongRORatio: '橙占比目标',
  collectionTotalGridSlots: '总藏品总格数（道具）',
  collectionAvgGrid: '总藏品平均格数（可选）',
  blueCollectionTotalGridSlots: '蓝色藏品总格数（可选）',
  blueCollectionAvgGrid: '蓝色藏品平均格数（技能）',
} as const satisfies Record<string, string>;

const estimatorWarnings = computed(() => {
  const w: string[] = [];
  const f = form;

  const ctg = f.collectionTotalGridSlots.trim();
  const cag = f.collectionAvgGrid.trim();
  const bctg = f.blueCollectionTotalGridSlots.trim();
  const bcag = f.blueCollectionAvgGrid.trim();
  if (
    ctg !== '' &&
    isOptionalNonNegativeIntString(f.collectionTotalGridSlots) &&
    cag !== '' &&
    isOptionalDecimalString(f.collectionAvgGrid) &&
    Number.isFinite(Number.parseFloat(cag))
  ) {
    w.push('「总藏品总格数」与「总藏品平均格数」请只填其一。');
  }
  if (
    bctg !== '' &&
    isOptionalNonNegativeIntString(f.blueCollectionTotalGridSlots) &&
    bcag !== '' &&
    isOptionalDecimalString(f.blueCollectionAvgGrid) &&
    Number.isFinite(Number.parseFloat(bcag))
  ) {
    w.push('「蓝色藏品总格数」与「蓝色藏品平均格数」请只填其一。');
  }

  if (f.totalItems.trim() !== '' && !isRequiredNonNegativeIntString(f.totalItems)) {
    w.push(`「${FIELD_LABELS.totalItems}」须填写非负整数（仅数字）。`);
  }
  if (f.blueCount.trim() !== '' && !isRequiredNonNegativeIntString(f.blueCount)) {
    w.push(`「${FIELD_LABELS.blueCount}」须填写非负整数（仅数字）。`);
  }

  (['wgSlots', 'wgAvg', 'orangeAvg', 'purpleAvg', 'orangeAvgValue', 'purpleAvgValue', 'collectionAvgGrid', 'blueCollectionAvgGrid'] as const).forEach((key) => {
    if (!isOptionalDecimalString(f[key])) {
      w.push(`「${FIELD_LABELS[key]}」须为合法数字（可含小数点）；不要输入字母或多余符号。`);
    }
  });

  (
    [
      'orangeFixedCount',
      'orangeTotalSlots',
      'purpleFixedCount',
      'purpleTotalSlots',
      'collectionTotalGridSlots',
      'blueCollectionTotalGridSlots',
    ] as const
  ).forEach((key) => {
    if (!isOptionalNonNegativeIntString(f[key])) {
      w.push(`「${FIELD_LABELS[key]}」要么留空，要么填非负整数。`);
    }
  });

  (
    [
      'redUnitValue',
      'orangeUnitValue',
      'purpleUnitValue',
      'redGridUnitValue',
      'orangeGridUnitValue',
      'purpleGridUnitValue',
    ] as const
  ).forEach((key) => {
    if (f[key].trim() !== '' && !isRequiredNonNegativeIntString(f[key])) {
      w.push(`「${FIELD_LABELS[key]}」须填写非负整数（仅数字）。`);
    }
  });

  (['expectedPurpleRatio', 'expectedOrangeAmongRORatio'] as const).forEach((key) => {
    if (!isOptionalDecimalString(f[key])) {
      w.push(`「${FIELD_LABELS[key]}」须为 0~1 之间的数字（可含小数点）。`);
      return;
    }
    const v = Number.parseFloat(f[key]);
    if (Number.isFinite(v) && (v < 0 || v > 1)) {
      w.push(`「${FIELD_LABELS[key]}」须为 0~1 之间的数字。`);
    }
  });

  return w;
});

function clearForm(): void {
  Object.assign(form, clearedForm);
}

/** 空串或非法解析 → `undefined`；总藏品、蓝数未填不传 0。 */
function getEstimatorInput(currentForm: FormState): GameEstimatorInput {
  return {
    totalItems: toInt(currentForm.totalItems),
    wgSlots: toFloat(currentForm.wgSlots),
    wgAvg: toFloat(currentForm.wgAvg),
    orangeAvg: toFloat(currentForm.orangeAvg),
    orangeAvgStr: trimmedFieldRaw(currentForm.orangeAvg),
    orangeAvgValue: toFloat(currentForm.orangeAvgValue),
    orangeAvgValueStr: trimmedFieldRaw(currentForm.orangeAvgValue),
    blueCount: toInt(currentForm.blueCount),
    orangeFixedCount: toInt(currentForm.orangeFixedCount),
    orangeTotalSlots: toInt(currentForm.orangeTotalSlots),
    purpleFixedCount: toInt(currentForm.purpleFixedCount),
    purpleTotalSlots: toInt(currentForm.purpleTotalSlots),
    purpleAvg: toFloat(currentForm.purpleAvg),
    purpleAvgStr: trimmedFieldRaw(currentForm.purpleAvg),
    purpleAvgValue: toFloat(currentForm.purpleAvgValue),
    purpleAvgValueStr: trimmedFieldRaw(currentForm.purpleAvgValue),
    collectionTotalGridSlots: toInt(currentForm.collectionTotalGridSlots),
    collectionAvgGridSlots: toFloat(currentForm.collectionAvgGrid),
    collectionAvgGridSlotsStr: trimmedFieldRaw(currentForm.collectionAvgGrid),
    blueCollectionTotalGridSlots: toInt(currentForm.blueCollectionTotalGridSlots),
    blueCollectionAvgGridSlots: toFloat(currentForm.blueCollectionAvgGrid),
    blueCollectionAvgGridSlotsStr: trimmedFieldRaw(currentForm.blueCollectionAvgGrid),
    redUnitValue: toInt(currentForm.redUnitValue) ?? DEFAULT_RED_UNIT_VALUE,
    orangeUnitValue: toInt(currentForm.orangeUnitValue) ?? DEFAULT_ORANGE_UNIT_VALUE,
    purpleUnitValue: toInt(currentForm.purpleUnitValue) ?? DEFAULT_PURPLE_UNIT_VALUE,
    redGridUnitValue: toInt(currentForm.redGridUnitValue) ?? DEFAULT_RED_GRID_UNIT_VALUE,
    orangeGridUnitValue: toInt(currentForm.orangeGridUnitValue) ?? DEFAULT_ORANGE_GRID_UNIT_VALUE,
    purpleGridUnitValue: toInt(currentForm.purpleGridUnitValue) ?? DEFAULT_PURPLE_GRID_UNIT_VALUE,
    expectedPurpleRatio: toFloat(currentForm.expectedPurpleRatio),
    expectedOrangeAmongRORatio: toFloat(currentForm.expectedOrangeAmongRORatio),
  };
}

/** 非空则返回 `trim`，否则 `undefined`（用于平均格数/价值原文精度）。 */
function trimmedFieldRaw(s: string): string | undefined {
  const t = s.trim();
  return t === '' ? undefined : t;
}

/** `parseInt` 失败返回 `undefined`。 */
function toInt(value: string): number | undefined {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/** `parseFloat` 失败返回 `undefined`。 */
function toFloat(value: string): number | undefined {
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/** 货币单位 →「x.x万」；`null` 显示为未知。 */
function formatWan(value: number | null): string {
  if (value === null) {
    return '未知';
  }

  return `${(value / 10000).toFixed(1)}万`;
}

/** 格数展示：无效或未推算时显示 0。 */
function formatInfGrid(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '0';
  }
  return String(value);
}

function formatCountCandidates(values: number[]): string {
  if (values.length === 0) {
    return '';
  }
  if (values.length <= 12) {
    return values.join('，');
  }

  const ranges: string[] = [];
  let start = values[0];
  let end = values[0];

  for (let i = 1; i < values.length; i += 1) {
    const current = values[i];
    if (current === end + 1) {
      end = current;
      continue;
    }

    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    start = current;
    end = current;
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);

  return `${ranges.join('，')}（共${values.length}个）`;
}
</script>

<template>
  <section class="inner-section">
    <h2>艾哈迈德（石油王）</h2>

    <p class="result-hint-muted">
      <strong>技能被动</strong>顺序固定：第一回合<strong>总藏品数量</strong> → 第二回合<strong>橙色平均格数</strong> → 第三回合<strong>紫色平均格数</strong>；每回合表单内<strong>技能在上、道具在下</strong>。
      三件道具常用顺序为<strong>普品均格 → 良品存量 → 普品扫描</strong>，局内可先买其中任意一件，已填项会尽量参与推算（未齐时「橙紫红总数量」可能显示<strong>上界</strong>）。
      橙/紫<strong>平均格数、平均价值</strong>请按局内<strong>原样小数位</strong>填写（<strong>0.9</strong> 与 <strong>0.90</strong> 规则不同）；只写<strong>一位</strong>小数时，还须 <strong>平均×件数为整数</strong>（如 <strong>0.3</strong> 不会出现 <strong>15</strong>）。
    </p>

    <div class="sub-panel">
      <h3>第一回合</h3>
      <div class="grid">
        <label>总藏品数量（技能）</label>
        <input v-model="form.totalItems" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" />
        <label>白绿平均格数（道具）</label>
        <input v-model="form.wgAvg" type="text" inputmode="decimal" autocomplete="off" />
      </div>
    </div>

    <div class="sub-panel">
      <h3>第二回合</h3>
      <div class="grid">
        <label>橙色平均格数（技能）</label>
        <input v-model="form.orangeAvg" type="text" inputmode="decimal" autocomplete="off" />
        <label>蓝色总数量（道具）</label>
        <input v-model="form.blueCount" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" />
        <label>橙色平均价值（可选）</label>
        <input v-model="form.orangeAvgValue" type="text" inputmode="decimal" autocomplete="off" />
        <label>橙色确定数量（可选）</label>
        <input v-model="form.orangeFixedCount" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" />
        <label>橙色总格数（可选）</label>
        <input v-model="form.orangeTotalSlots" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" />
      </div>
    </div>

    <div class="sub-panel">
      <h3>第三回合</h3>
      <div class="grid">
        <label>紫色平均格数（技能）</label>
        <input v-model="form.purpleAvg" type="text" inputmode="decimal" autocomplete="off" />
        <label>白绿总占位（道具）</label>
        <input v-model="form.wgSlots" type="text" inputmode="decimal" autocomplete="off" />
        <label>紫色平均价值（可选）</label>
        <input v-model="form.purpleAvgValue" type="text" inputmode="decimal" autocomplete="off" />
        <label>紫色确定数量（可选）</label>
        <input v-model="form.purpleFixedCount" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" />
        <label>紫色总格数（可选）</label>
        <input v-model="form.purpleTotalSlots" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" />
      </div>
    </div>

    <div class="sub-panel sub-panel--collapsible" :class="{ 'sub-panel--collapsible-open': otherOptionsOpen }">
      <button
        type="button"
        class="collapse-trigger"
        :aria-expanded="otherOptionsOpen"
        aria-controls="estimator-other-options"
        @click="otherOptionsOpen = !otherOptionsOpen"
      >
        <span class="collapse-trigger-main">
          <span class="collapse-trigger-title">第四回合（可选）</span>
          <span v-if="!otherOptionsOpen && hasOtherGridOptionsFilled" class="collapse-trigger-badge">已填写</span>
        </span>
        <span
          class="collapse-chevron"
          :class="{ 'collapse-chevron--open': otherOptionsOpen }"
          aria-hidden="true"
        ></span>
      </button>
      <div v-show="otherOptionsOpen" id="estimator-other-options" class="collapse-body">
        <p class="result-hint-muted collapse-body-hint">
          第四回合信息<strong>不是必买</strong>，但填齐后可在结果里看到<strong>格数：</strong>后的红、橙总格推断。
          道具<strong>总仓储空间</strong>可读<strong>全藏品总格数</strong>；<strong>总藏品平均格数</strong>有时由<strong>场地</strong>直接给出（与总格数二选一即可）。<strong>技能</strong>可读<strong>蓝色藏品平均格数</strong>（或与蓝色总格数二选一）。
          再与前面已填的<strong>白绿总占位</strong>等结合，往往能把<strong>红色藏品的总格数</strong>收窄到更确定的值。
        </p>
        <div class="grid">
          <label>蓝色藏品平均格数（技能）</label>
          <input v-model="form.blueCollectionAvgGrid" type="text" inputmode="decimal" autocomplete="off" />
          <label>蓝色藏品总格数（可选）</label>
          <input v-model="form.blueCollectionTotalGridSlots" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" />
          <label>总藏品总格数（道具）</label>
          <input v-model="form.collectionTotalGridSlots" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" />
          <label>总藏品平均格数（可选）</label>
          <input v-model="form.collectionAvgGrid" type="text" inputmode="decimal" autocomplete="off" />
        </div>
      </div>
    </div>

    <div class="inline-form">
      <button type="button" @click="clearForm">清零</button>
    </div>

    <div v-if="estimatorWarnings.length" class="form-warnings" role="status">
      <p class="form-warnings-title">输入格式有问题，请先修正（否则推算可能不可靠）：</p>
      <ul>
        <li v-for="(msg, idx) in estimatorWarnings" :key="idx">{{ msg }}</li>
      </ul>
    </div>

    <div class="result-box">
      <div v-if="!hideValueRangeLine" class="result-value-block">
        <p class="result-value-headline">
          <strong>预估价值范围：</strong>{{ formatWan(result.minValue) }} ~ {{ formatWan(result.maxValue) }}
          <span v-if="result.gridSlotInferenceActive" class="result-hint-muted result-value-headline-note">
            （含件数估值与格数估值）
          </span>
        </p>
        <p v-if="result.minValueCombo && valueRangeCountsDiffer" class="result-value-sub">
          <span class="result-sub-tag">藏品数量</span>
          <template v-if="result.maxValueCombo">
            <span class="result-sub-range-label">低</span>
            <span class="sample-result-chip" title="红色件数">
              <span class="sample-result-dot sample-result-dot--red" aria-hidden="true"></span>
              <span class="sample-qty-num sample-qty-num--red">{{ result.minValueCombo.red }}</span>
            </span>
            <span class="sample-result-chip" title="橙色件数">
              <span class="sample-result-dot sample-result-dot--orange" aria-hidden="true"></span>
              <span class="sample-qty-num sample-qty-num--orange">{{ result.minValueCombo.orange }}</span>
            </span>
            <span class="sample-result-chip" title="紫色件数">
              <span class="sample-result-dot sample-result-dot--purple" aria-hidden="true"></span>
              <span class="sample-qty-num sample-qty-num--purple">{{ result.minValueCombo.purple }}</span>
            </span>
            <span class="result-sub-range-label">高</span>
            <span class="sample-result-chip" title="红色件数">
              <span class="sample-result-dot sample-result-dot--red" aria-hidden="true"></span>
              <span class="sample-qty-num sample-qty-num--red">{{ result.maxValueCombo.red }}</span>
            </span>
            <span class="sample-result-chip" title="橙色件数">
              <span class="sample-result-dot sample-result-dot--orange" aria-hidden="true"></span>
              <span class="sample-qty-num sample-qty-num--orange">{{ result.maxValueCombo.orange }}</span>
            </span>
            <span class="sample-result-chip" title="紫色件数">
              <span class="sample-result-dot sample-result-dot--purple" aria-hidden="true"></span>
              <span class="sample-qty-num sample-qty-num--purple">{{ result.maxValueCombo.purple }}</span>
            </span>
          </template>
        </p>
        <p
          v-if="result.gridSlotInferenceActive && result.gridMinCombo && gridRangeSlotsDiffer"
          class="result-value-sub"
        >
          <span class="result-sub-tag">藏品格数</span>
          <template v-if="result.gridMaxCombo">
            <span class="result-sub-range-label">少</span>
            <span class="sample-result-chip" title="红色总格数">
              <span class="sample-result-square sample-result-square--red" aria-hidden="true"></span>
              <span class="sample-qty-num sample-qty-num--red">{{ formatInfGrid(result.gridMinCombo.redGridSlots) }}</span>
            </span>
            <span class="sample-result-chip" title="橙色总格数">
              <span class="sample-result-square sample-result-square--orange" aria-hidden="true"></span>
              <span class="sample-qty-num sample-qty-num--orange">{{ formatInfGrid(result.gridMinCombo.orangeGridSlots) }}</span>
            </span>
            <span class="result-sub-range-label">多</span>
            <span class="sample-result-chip" title="红色总格数">
              <span class="sample-result-square sample-result-square--red" aria-hidden="true"></span>
              <span class="sample-qty-num sample-qty-num--red">{{ formatInfGrid(result.gridMaxCombo.redGridSlots) }}</span>
            </span>
            <span class="sample-result-chip" title="橙色总格数">
              <span class="sample-result-square sample-result-square--orange" aria-hidden="true"></span>
              <span class="sample-qty-num sample-qty-num--orange">{{ formatInfGrid(result.gridMaxCombo.orangeGridSlots) }}</span>
            </span>
          </template>
        </p>
      </div>

      <div class="result-value-block">
        <p class="result-value-headline">
          <strong>预估期望价值</strong>
        </p>
        <p v-if="result.expectedCombo" class="result-value-sub">
          <span class="result-sub-tag">藏品数量</span>
          <span class="sample-result-chip" title="红色件数">
            <span class="sample-result-dot sample-result-dot--red" aria-hidden="true"></span>
            <span class="sample-qty-num sample-qty-num--red">{{ result.expectedCombo.red }}</span>
          </span>
          <span class="sample-result-chip" title="橙色件数">
            <span class="sample-result-dot sample-result-dot--orange" aria-hidden="true"></span>
            <span class="sample-qty-num sample-qty-num--orange">{{ result.expectedCombo.orange }}</span>
          </span>
          <span class="sample-result-chip" title="紫色件数">
            <span class="sample-result-dot sample-result-dot--purple" aria-hidden="true"></span>
            <span class="sample-qty-num sample-qty-num--purple">{{ result.expectedCombo.purple }}</span>
          </span>
          <span class="result-value-inline-wan">{{ formatWan(result.expectedValue) }}</span>
        </p>
        <p v-else class="result-value-sub">
          <span class="result-sub-tag">藏品数量</span>
          <span class="result-value-inline-wan">{{ formatWan(result.expectedValue) }}</span>
        </p>
        <p v-if="result.gridSlotInferenceActive && result.expectedGridCombo" class="result-value-sub">
          <span class="result-sub-tag">藏品格数</span>
          <span class="sample-result-chip" title="红色总格数">
            <span class="sample-result-square sample-result-square--red" aria-hidden="true"></span>
            <span class="sample-qty-num sample-qty-num--red">{{ formatInfGrid(result.expectedGridCombo.redGridSlots) }}</span>
          </span>
          <span class="sample-result-chip" title="橙色总格数">
            <span class="sample-result-square sample-result-square--orange" aria-hidden="true"></span>
            <span class="sample-qty-num sample-qty-num--orange">{{ formatInfGrid(result.expectedGridCombo.orangeGridSlots) }}</span>
          </span>
          <span class="result-value-inline-wan">{{ formatWan(result.expectedGridValue) }}</span>
        </p>
      </div>
      <hr />
      <p>
        <strong>橙紫红总数量：</strong>{{ remainDisplay }}
        <template v-if="result.remain === null && result.remainUpperBound !== null">
          <span class="result-hint-muted"> — 此为根据当前已填项得到的<strong>上界</strong>；总藏品、白绿与蓝色齐后为精确值。</span>
        </template>
      </p>
      <p class="qty-line qty-line--red">
        <span class="qty-line-icon" aria-hidden="true"></span>
        <span class="qty-line-main">
          <strong class="qty-line-title">红色可能数量：</strong>
          <template v-if="result.redList.length">{{ formatCountCandidates(result.redList) }}</template>
          <span v-else class="result-hint-muted">暂时无法推算或条件矛盾</span>
        </span>
      </p>
      <p class="qty-line qty-line--orange">
        <span class="qty-line-icon" aria-hidden="true"></span>
        <span class="qty-line-main">
          <strong class="qty-line-title">橙色可能数量：</strong>
          <template v-if="result.orangeList.length">{{ formatCountCandidates(result.orangeList) }}</template>
          <span v-else class="result-hint-muted">暂时无法推算或条件矛盾</span>
        </span>
      </p>
      <p class="qty-line qty-line--purple">
        <span class="qty-line-icon" aria-hidden="true"></span>
        <span class="qty-line-main">
          <strong class="qty-line-title">紫色可能数量：</strong>
          <template v-if="result.purpleList.length">{{ formatCountCandidates(result.purpleList) }}</template>
          <span v-else class="result-hint-muted">暂时无法推算或条件矛盾</span>
        </span>
      </p>
      <p><strong>白绿总数量：</strong>{{ result.wgCount ?? '未知' }}</p>
      <p><strong>蓝色数量：</strong>{{ toInt(form.blueCount) ?? '未知' }}</p>
      <p
        v-if="estimatorWarnings.length === 0 && (!result.orangeList.length || !result.purpleList.length)"
        class="result-hint-muted"
      >
        若上述各项格式无误仍无解，多为游戏内数值与条件不一致，请回到游戏核对后再试。
      </p>
      <hr />
      <div>
        <strong>代表性可能结果</strong>
        <p class="result-hint-muted samples-section-hint">件数与格数无法一一对应，故分开展示。</p>
        <p class="samples-group-title">藏品数量</p>
        <p v-if="result.samples.length === 0" class="result-hint-muted">暂无</p>
        <ul v-else class="samples-list">
          <li
            v-for="item in result.samples"
            :key="`c-${item.orange}-${item.purple}-${item.red}`"
            class="sample-result-line"
            title="红、橙、紫 件数与件数估值"
          >
            <span>价值 {{ (item.value / 10000).toFixed(1) }}万</span>
            <span class="sample-result-sep">｜</span>
            <span class="sample-result-chip">
              <span class="sample-result-dot sample-result-dot--red" aria-hidden="true"></span>
              <span class="sample-qty-num sample-qty-num--red">{{ item.red }}</span>
            </span>
            <span class="sample-result-sep">｜</span>
            <span class="sample-result-chip">
              <span class="sample-result-dot sample-result-dot--orange" aria-hidden="true"></span>
              <span class="sample-qty-num sample-qty-num--orange">{{ item.orange }}</span>
            </span>
            <span class="sample-result-sep">｜</span>
            <span class="sample-result-chip">
              <span class="sample-result-dot sample-result-dot--purple" aria-hidden="true"></span>
              <span class="sample-qty-num sample-qty-num--purple">{{ item.purple }}</span>
            </span>
          </li>
        </ul>
        <template v-if="result.gridSlotInferenceActive">
          <p class="samples-group-title">藏品格数</p>
          <p v-if="result.gridSamples.length === 0" class="result-hint-muted">暂无</p>
          <ul v-else class="samples-list">
            <li
              v-for="item in result.gridSamples"
              :key="`g-${item.redGridSlots}-${item.orangeGridSlots}`"
              class="sample-result-line"
              title="红、橙总格与格数估值"
            >
              <span>格数价值 {{ formatGridSampleWan(item) }}</span>
              <span class="sample-result-sep">｜</span>
              <span class="sample-result-chip" title="红色总格数">
                <span class="sample-result-square sample-result-square--red" aria-hidden="true"></span>
                <span class="sample-qty-num sample-qty-num--red">{{ formatInfGrid(item.redGridSlots) }}</span>
              </span>
              <span class="sample-result-sep">｜</span>
              <span class="sample-result-chip" title="橙色总格数">
                <span class="sample-result-square sample-result-square--orange" aria-hidden="true"></span>
                <span class="sample-qty-num sample-qty-num--orange">{{ formatInfGrid(item.orangeGridSlots) }}</span>
              </span>
            </li>
          </ul>
        </template>
      </div>
      <p class="result-hint-muted value-disclaimer value-disclaimer--footer">
        <strong>价值粗算（仅供参考）：</strong>件数按下方<strong>每件单价</strong>估算（若填写橙/紫平均价值则按“平均价值 × 数量”计入）；第四回合填齐后另给<strong>格数价值</strong>，按<strong>每格单价</strong>估算，二者相互独立，均可在下方自行修改。
        局里<strong>实际价格会波动</strong>，上述区间<strong>勿当作精确估值或成交价</strong>。
      </p>
      <p class="result-hint-muted">
        上述默认单价大致按<strong>别墅区</strong>常见水平预设。作者认为石油王在当前的<strong>沉船、拍卖</strong>等环境下<strong>不一定好发挥</strong>：红色特别多时，往往<strong>仅靠已知信息仍不够</strong>。
        若仍要在这些环境使用，请在下方<strong>自行调高红色单价等</strong>（例如红色约<strong>20 万/件</strong>），并酌情调整期望占比。
      </p>
      <div class="sub-panel">
        <h3>估值单价设置（普通单位）</h3>
        <p class="result-hint-muted unit-settings-intro">
          件数估值与格数估值分开填写；清零时这些单价会保留，便于按常打区服预设。
        </p>
        <p class="unit-settings-group-title">每件单价</p>
        <div class="grid">
          <label>红色每件单价</label>
          <input v-model="form.redUnitValue" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" />
          <label>橙色每件单价</label>
          <input v-model="form.orangeUnitValue" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" />
          <label>紫色每件单价</label>
          <input v-model="form.purpleUnitValue" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" />
        </div>
        <p class="unit-settings-group-title">每格单价</p>
        <div class="grid">
          <label>红色每格单价</label>
          <input v-model="form.redGridUnitValue" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" />
          <label>橙色每格单价</label>
          <input v-model="form.orangeGridUnitValue" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" />
          <label>紫色每格单价</label>
          <input v-model="form.purpleGridUnitValue" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" />
        </div>
      </div>

      <div class="sub-panel">
        <h3>期望设置（动态比例目标）</h3>
        <div class="grid">
          <label>紫占比目标</label>
          <input
            v-model="form.expectedPurpleRatio"
            type="text"
            inputmode="decimal"
            autocomplete="off"
          />
          <label>橙占比目标</label>
          <input
            v-model="form.expectedOrangeAmongRORatio"
            type="text"
            inputmode="decimal"
            autocomplete="off"
          />
        </div>
        <p class="result-hint-muted">
          紫占比目标 = 紫色 / (红色 + 橙色 + 紫色)；橙占比目标 = 橙色 / (红色 + 橙色)。
        </p>
      </div>
    </div>
  </section>
</template>
