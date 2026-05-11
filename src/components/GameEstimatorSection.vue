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

/**
 * 默认值来自原始 HTML 版本，便于你对照验证结果是否一致。
 */
const initialForm: FormState = {
  totalItems: '48',
  wgSlots: '17',
  wgAvg: '2.12',
  orangeAvg: '0.88',
  blueCount: '13',
  orangeFixedCount: '',
  orangeTotalSlots: '',
  purpleFixedCount: '',
  purpleTotalSlots: '',
  purpleAvg: '0.75',
};

const form = reactive<FormState>({ ...initialForm });
const result = computed(() => estimateGame(getEstimatorInput(form)));

const FIELD_LABELS = {
  totalItems: '总藏品数量',
  wgSlots: '白绿总占位',
  wgAvg: '白绿平均格数',
  orangeAvg: '橙色平均格数',
  blueCount: '蓝色总数量',
  purpleAvg: '紫色平均格数',
  orangeFixedCount: '橙色确定数量',
  orangeTotalSlots: '橙色总格数',
  purpleFixedCount: '紫色确定数量',
  purpleTotalSlots: '紫色总格数',
} as const satisfies Record<string, string>;

const estimatorWarnings = computed(() => {
  const w: string[] = [];
  const f = form;

  if (!isRequiredNonNegativeIntString(f.totalItems)) {
    w.push(`「${FIELD_LABELS.totalItems}」须填写非负整数（仅数字），不能为空。`);
  }
  if (!isRequiredNonNegativeIntString(f.blueCount)) {
    w.push(`「${FIELD_LABELS.blueCount}」须填写非负整数（仅数字），不能为空。`);
  }

  (['wgSlots', 'wgAvg', 'orangeAvg', 'purpleAvg'] as const).forEach((key) => {
    if (!isOptionalDecimalString(f[key])) {
      w.push(`「${FIELD_LABELS[key]}」须为合法数字（可含小数点）；不要输入字母或多余符号。`);
    }
  });

  (['orangeFixedCount', 'orangeTotalSlots', 'purpleFixedCount', 'purpleTotalSlots'] as const).forEach((key) => {
    if (!isOptionalNonNegativeIntString(f[key])) {
      w.push(`「${FIELD_LABELS[key]}」要么留空，要么填非负整数。`);
    }
  });

  return w;
});

function resetForm(): void {
  Object.assign(form, initialForm);
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
    blueCount: toInt(currentForm.blueCount) ?? 0,
    orangeFixedCount: toInt(currentForm.orangeFixedCount),
    orangeTotalSlots: toInt(currentForm.orangeTotalSlots),
    purpleFixedCount: toInt(currentForm.purpleFixedCount),
    purpleTotalSlots: toInt(currentForm.purpleTotalSlots),
    purpleAvg: toFloat(currentForm.purpleAvg),
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
        <label>紫色确定数量（可选）</label>
        <input v-model="form.purpleFixedCount" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" />
        <label>紫色总格数（可选）</label>
        <input v-model="form.purpleTotalSlots" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" />
      </div>
    </div>

    <div class="inline-form">
      <button type="button" @click="resetForm">恢复默认</button>
    </div>

    <div v-if="estimatorWarnings.length" class="form-warnings" role="status">
      <p class="form-warnings-title">输入格式有问题，请先修正（否则推算可能不可靠）：</p>
      <ul>
        <li v-for="(msg, idx) in estimatorWarnings" :key="idx">{{ msg }}</li>
      </ul>
    </div>

    <div class="result-box">
      <p><strong>预估价值范围：</strong>{{ formatWan(result.minValue) }} ~ {{ formatWan(result.maxValue) }}</p>
      <p><strong>预估期望价值：</strong>{{ formatWan(result.expectedValue) }}</p>
      <hr />
      <p><strong>橙紫红总数量：</strong>{{ result.remain ?? '未知' }}</p>
      <p class="qty-line qty-line--red">
        <span class="qty-line-icon" aria-hidden="true"></span>
        <span class="qty-line-main">
          <strong class="qty-line-title">红色可能数量：</strong>
          <template v-if="result.redList.length">{{ result.redList.join('，') }}</template>
          <span v-else class="result-hint-muted">暂时无法推算或条件矛盾</span>
        </span>
      </p>
      <p class="qty-line qty-line--orange">
        <span class="qty-line-icon" aria-hidden="true"></span>
        <span class="qty-line-main">
          <strong class="qty-line-title">橙色可能数量：</strong>
          <template v-if="result.orangeList.length">{{ result.orangeList.join('，') }}</template>
          <span v-else class="result-hint-muted">无解（可能输入错误或条件矛盾）</span>
        </span>
      </p>
      <p class="qty-line qty-line--purple">
        <span class="qty-line-icon" aria-hidden="true"></span>
        <span class="qty-line-main">
          <strong class="qty-line-title">紫色可能数量：</strong>
          <template v-if="result.purpleList.length">{{ result.purpleList.join('，') }}</template>
          <span v-else class="result-hint-muted">无解（可能输入错误或条件矛盾）</span>
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
        <strong>价值粗算（仅供参考）：</strong>按简化单价——<strong>橙色约 4 万/件、红色约 15 万/件</strong>（紫色未计入），在合法组合间比相对高低。
        局里<strong>橙色也可能很便宜、红色也未必值满价</strong>，上述区间<strong>勿当作精确估值或成交价</strong>。
      </p>
    </div>
  </section>
</template>
