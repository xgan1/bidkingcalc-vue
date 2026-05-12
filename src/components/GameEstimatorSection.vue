<script setup lang="ts">
import { computed, reactive } from 'vue';
import type { GameEstimatorInput } from '../types/calculator';
import { estimateGame } from '../utils/calculators';
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
const DEFAULT_EXPECTED_RATIO = 0.66;

/** 与首版静态 HTML 演示数据对齐，便于回归对照。 */
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
  expectedPurpleRatio: `${DEFAULT_EXPECTED_RATIO}`,
  expectedOrangeAmongRORatio: `${DEFAULT_EXPECTED_RATIO}`,
};

const form = reactive<FormState>({ ...initialForm });

/** 清零模板：局内读数字段清空；估值单价与期望占比五栏保留当前值（不随清零重置）。 */
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
};

const result = computed(() => estimateGame(getEstimatorInput(form)));
const remainDisplay = computed(() => {
  if (result.value.remain !== null) {
    return `${result.value.remain}`;
  }
  if (result.value.remainUpperBound !== null) {
    return `至多 ${result.value.remainUpperBound}（上界）`;
  }
  return '未知';
});

/** min===max 时隐藏「价值范围」行。 */
const hideValueRangeLine = computed(() => {
  const r = result.value;
  return r.minValue !== null && r.maxValue !== null && r.minValue === r.maxValue;
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
  redUnitValue: '红色单价',
  orangeUnitValue: '橙色单价',
  purpleUnitValue: '紫色单价',
  expectedPurpleRatio: '紫占比目标',
  expectedOrangeAmongRORatio: '橙占比目标',
} as const satisfies Record<string, string>;

const estimatorWarnings = computed(() => {
  const w: string[] = [];
  const f = form;

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
    orangeAvgValue: toFloat(currentForm.orangeAvgValue),
    blueCount: toInt(currentForm.blueCount),
    orangeFixedCount: toInt(currentForm.orangeFixedCount),
    orangeTotalSlots: toInt(currentForm.orangeTotalSlots),
    purpleFixedCount: toInt(currentForm.purpleFixedCount),
    purpleTotalSlots: toInt(currentForm.purpleTotalSlots),
    purpleAvg: toFloat(currentForm.purpleAvg),
    purpleAvgValue: toFloat(currentForm.purpleAvgValue),
    redUnitValue: toInt(currentForm.redUnitValue) ?? DEFAULT_RED_UNIT_VALUE,
    orangeUnitValue: toInt(currentForm.orangeUnitValue) ?? DEFAULT_ORANGE_UNIT_VALUE,
    purpleUnitValue: toInt(currentForm.purpleUnitValue) ?? DEFAULT_PURPLE_UNIT_VALUE,
    expectedPurpleRatio: toFloat(currentForm.expectedPurpleRatio),
    expectedOrangeAmongRORatio: toFloat(currentForm.expectedOrangeAmongRORatio),
  };
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
      <p v-if="!hideValueRangeLine">
        <strong>预估价值范围：</strong>{{ formatWan(result.minValue) }} ~ {{ formatWan(result.maxValue) }}
      </p>
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
      <p class="result-hint-muted">
        上述默认单价大致按<strong>别墅区</strong>常见水平预设。作者认为石油王在当前的<strong>沉船、拍卖</strong>等环境下<strong>不一定好发挥</strong>：红色特别多时，往往<strong>仅靠已知信息仍不够</strong>。
        若仍要在这些环境使用，请在下方<strong>自行调高红色单价等</strong>（例如红色约<strong>20 万/件</strong>），并酌情调整期望占比。
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
