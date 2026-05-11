<script setup lang="ts">
import { computed, reactive } from 'vue';
import type { GameEstimatorInput } from '../types/calculator';
import { estimateGame } from '../utils/calculators';
import {
  isOptionalDecimalString,
  isOptionalNonNegativeIntString,
  isRequiredNonNegativeIntString,
} from '../utils/numericForm';

/**
 * 艾哈迈德（石油王）推算器（表单 + 展示）
 *
 * 这个组件负责：
 * - 收集用户输入（全部用字符串存表单，减少输入过程的“数字校验干扰”）
 * - 将字符串转换成 `GameEstimatorInput`（数字/可选数字）
 * - 调用 `estimateGame` 得到结构化结果并展示
 *
 * 关键点：这里不写核心算法，只做数据准备和 UI 渲染。
 */

type FormState = Record<string, string>;
const DEFAULT_RED_UNIT_VALUE = 150000;
const DEFAULT_ORANGE_UNIT_VALUE = 30000;
const DEFAULT_PURPLE_UNIT_VALUE = 10000;

/**
 * 默认值来自原始 HTML 版本，便于你对照验证结果是否一致。
 */
const initialForm: FormState = {
  totalItems: '48',
  wgSlots: '17',
  wgAvg: '2.12',
  orangeAvg: '0.88',
  orangeAvgValue: '',
  blueCount: '13',
  orangeFixedCount: '',
  orangeTotalSlots: '',
  purpleFixedCount: '',
  purpleTotalSlots: '',
  purpleAvg: '0.75',
  purpleAvgValue: '',
  redUnitValue: `${DEFAULT_RED_UNIT_VALUE}`,
  orangeUnitValue: `${DEFAULT_ORANGE_UNIT_VALUE}`,
  purpleUnitValue: `${DEFAULT_PURPLE_UNIT_VALUE}`,
};

const form = reactive<FormState>({ ...initialForm });

/** 一键清零（全部留空，不预填 0） */
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
  redUnitValue: `${DEFAULT_RED_UNIT_VALUE}`,
  orangeUnitValue: `${DEFAULT_ORANGE_UNIT_VALUE}`,
  purpleUnitValue: `${DEFAULT_PURPLE_UNIT_VALUE}`,
};

const result = computed(() => estimateGame(getEstimatorInput(form)));
const remainDisplay = computed(() => {
  if (result.value.remain === null) {
    return '未知';
  }
  const blueProvided = isRequiredNonNegativeIntString(form.blueCount);
  return blueProvided ? `${result.value.remain}` : `${result.value.remain}（最多）`;
});

const FIELD_LABELS = {
  totalItems: '总藏品数量',
  wgSlots: '白绿总占位',
  wgAvg: '白绿平均格数',
  orangeAvg: '橙色平均格数',
  orangeAvgValue: '橙色平均价值',
  blueCount: '蓝色总数量',
  purpleAvg: '紫色平均格数',
  purpleAvgValue: '紫色平均价值',
  orangeFixedCount: '橙色确定数量',
  orangeTotalSlots: '橙色总格数',
  purpleFixedCount: '紫色确定数量',
  purpleTotalSlots: '紫色总格数',
  redUnitValue: '红色单价',
  orangeUnitValue: '橙色单价',
  purpleUnitValue: '紫色单价',
} as const satisfies Record<string, string>;

const estimatorWarnings = computed(() => {
  const w: string[] = [];
  const f = form;

  // 第一回合不一定能拿到信息：空就不报错；只有填写了但格式不对才提示
  if (f.totalItems.trim() !== '' && !isRequiredNonNegativeIntString(f.totalItems)) {
    w.push(`「${FIELD_LABELS.totalItems}」须填写非负整数（仅数字）。`);
  }
  if (f.blueCount.trim() !== '' && !isRequiredNonNegativeIntString(f.blueCount)) {
    w.push(`「${FIELD_LABELS.blueCount}」须填写非负整数（仅数字）。`);
  }

  (['wgSlots', 'wgAvg', 'orangeAvg', 'purpleAvg', 'orangeAvgValue', 'purpleAvgValue'] as const).forEach((key) => {
    if (!isOptionalDecimalString(f[key])) {
      w.push(`「${FIELD_LABELS[key]}」须为合法数字（可含小数点）；不要输入字母或多余符号。`);
    }
  });

  (['orangeFixedCount', 'orangeTotalSlots', 'purpleFixedCount', 'purpleTotalSlots'] as const).forEach((key) => {
    if (!isOptionalNonNegativeIntString(f[key])) {
      w.push(`「${FIELD_LABELS[key]}」要么留空，要么填非负整数。`);
    }
  });

  (['redUnitValue', 'orangeUnitValue', 'purpleUnitValue'] as const).forEach((key) => {
    if (f[key].trim() !== '' && !isRequiredNonNegativeIntString(f[key])) {
      w.push(`「${FIELD_LABELS[key]}」须填写非负整数（仅数字）。`);
    }
  });

  return w;
});

function clearForm(): void {
  Object.assign(form, clearedForm);
}

function getEstimatorInput(currentForm: FormState): GameEstimatorInput {
  /**
   * 表单 -> 业务输入类型转换
   *
   * 规则：
   * - 为空字符串 => undefined（表示“用户没提供该信息”）
   * - 无法解析 => undefined
   * - 对必填项（totalItems / blueCount）给一个 0 的兜底，避免 UI 崩掉
   */
  return {
    totalItems: toInt(currentForm.totalItems) ?? 0,
    wgSlots: toFloat(currentForm.wgSlots),
    wgAvg: toFloat(currentForm.wgAvg),
    orangeAvg: toFloat(currentForm.orangeAvg),
    orangeAvgValue: toFloat(currentForm.orangeAvgValue),
    blueCount: toInt(currentForm.blueCount) ?? 0,
    orangeFixedCount: toInt(currentForm.orangeFixedCount),
    orangeTotalSlots: toInt(currentForm.orangeTotalSlots),
    purpleFixedCount: toInt(currentForm.purpleFixedCount),
    purpleTotalSlots: toInt(currentForm.purpleTotalSlots),
    purpleAvg: toFloat(currentForm.purpleAvg),
    purpleAvgValue: toFloat(currentForm.purpleAvgValue),
    redUnitValue: toInt(currentForm.redUnitValue) ?? DEFAULT_RED_UNIT_VALUE,
    orangeUnitValue: toInt(currentForm.orangeUnitValue) ?? DEFAULT_ORANGE_UNIT_VALUE,
    purpleUnitValue: toInt(currentForm.purpleUnitValue) ?? DEFAULT_PURPLE_UNIT_VALUE,
  };
}

function toInt(value: string): number | undefined {
  /**
   * 安全的整数解析：
   * - 解析失败返回 undefined（而不是 NaN）
   */
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function toFloat(value: string): number | undefined {
  /**
   * 安全的小数解析：
   * - 解析失败返回 undefined（而不是 NaN）
   */
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function formatWan(value: number | null): string {
  /**
   * 将数值格式化成“xx.x万”，UI 更贴近你原始 HTML 的展示口径。
   */
  if (value === null) {
    return '未知';
  }

  return `${(value / 10000).toFixed(1)}万`;
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

    <div class="sub-panel">
      <h3>第一回合</h3>
      <div class="grid">
        <label>总藏品数量</label>
        <input v-model="form.totalItems" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" />
        <label>白绿总占位</label>
        <input v-model="form.wgSlots" type="text" inputmode="decimal" autocomplete="off" />
      </div>
    </div>

    <div class="sub-panel">
      <h3>第二回合</h3>
      <div class="grid">
        <label>白绿平均格数</label>
        <input v-model="form.wgAvg" type="text" inputmode="decimal" autocomplete="off" />
        <label>橙色平均格数</label>
        <input v-model="form.orangeAvg" type="text" inputmode="decimal" autocomplete="off" />
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
        <label>蓝色总数量</label>
        <input v-model="form.blueCount" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" />
        <label>紫色平均格数</label>
        <input v-model="form.purpleAvg" type="text" inputmode="decimal" autocomplete="off" />
        <label>紫色平均价值（可选）</label>
        <input v-model="form.purpleAvgValue" type="text" inputmode="decimal" autocomplete="off" />
        <label>紫色确定数量（可选）</label>
        <input v-model="form.purpleFixedCount" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" />
        <label>紫色总格数（可选）</label>
        <input v-model="form.purpleTotalSlots" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" />
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
      <p><strong>预估价值范围：</strong>{{ formatWan(result.minValue) }} ~ {{ formatWan(result.maxValue) }}</p>
      <p>
        <strong>预估期望价值：</strong>{{ formatWan(result.expectedValue) }}
        <template v-if="result.expectedCombo">
          <span class="sample-result-sep">｜</span>
          <span class="sample-result-chip" title="红色件数">
            <span class="sample-result-dot sample-result-dot--red" aria-hidden="true"></span>
            <span class="sample-qty-num sample-qty-num--red">{{ result.expectedCombo.red }}</span>
          </span>
          <span class="sample-result-sep">｜</span>
          <span class="sample-result-chip" title="橙色件数">
            <span class="sample-result-dot sample-result-dot--orange" aria-hidden="true"></span>
            <span class="sample-qty-num sample-qty-num--orange">{{ result.expectedCombo.orange }}</span>
          </span>
          <span class="sample-result-sep">｜</span>
          <span class="sample-result-chip" title="紫色件数">
            <span class="sample-result-dot sample-result-dot--purple" aria-hidden="true"></span>
            <span class="sample-qty-num sample-qty-num--purple">{{ result.expectedCombo.purple }}</span>
          </span>
        </template>
      </p>
      <hr />
      <p><strong>橙紫红总数量：</strong>{{ remainDisplay }}</p>
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
        <strong>代表性可能结果：</strong>
        <p v-if="result.samples.length === 0">暂无</p>
        <ul v-else>
          <li
            v-for="item in result.samples"
            :key="`${item.orange}-${item.purple}-${item.red}`"
            class="sample-result-line"
            title="依次为：红、橙、紫 件数"
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
      </div>
      <p class="result-hint-muted value-disclaimer value-disclaimer--footer">
        <strong>价值粗算（仅供参考）：</strong>按简化单价——<strong>红色 150000/件、橙色 30000/件、紫色 10000/件</strong>；若填写了橙/紫平均价值，则对应颜色按“平均价值 × 数量”直接计入。
        局里<strong>实际价格会波动</strong>，上述区间<strong>勿当作精确估值或成交价</strong>。
      </p>
      <div class="sub-panel">
        <h3>估值单价设置（普通单位）</h3>
        <div class="grid">
          <label>红色单价</label>
          <input v-model="form.redUnitValue" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" />
          <label>橙色单价</label>
          <input v-model="form.orangeUnitValue" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" />
          <label>紫色单价</label>
          <input v-model="form.purpleUnitValue" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" />
        </div>
      </div>
    </div>
  </section>
</template>
