<script setup lang="ts">
import { computed, ref } from 'vue';
import type { RoundingMode } from '../types/calculator';
import { getPossibleCounts } from '../utils/calculators';

/** 维克托线：按 `RoundingMode` 调用 `getPossibleCounts`。 */

interface Props {
  title: string;
  mode: RoundingMode;
  inputLabel: string;
  defaultValue?: string;
}

const props = withDefaults(defineProps<Props>(), {
  defaultValue: '0.45',
});

type ParseAvgResult = { ok: true; value: number } | { ok: false; message: string };

function parseAverageInputStrict(raw: string): ParseAvgResult {
  const t = raw.trim();

  if (t === '') {
    return { ok: false, message: '请输入数值。' };
  }

  if (/^\d+$/.test(t) && !t.includes('.')) {
    return { ok: false, message: '请显式输入两位小数（例如 0.87），不要只输入整数 87。' };
  }

  if (!/^-?(?:\d+\.\d+|\d+\.|\d+|\.\d+)$/.test(t)) {
    return { ok: false, message: '请输入合法数字（仅数字与一个小数点，不要字母或其它符号）。' };
  }

  const v = Number.parseFloat(t);
  if (!Number.isFinite(v)) {
    return { ok: false, message: '无法解析为数字，请检查输入。' };
  }
  if (v < 0) {
    return { ok: false, message: '平均值须为 ≥ 0 的数。' };
  }

  return { ok: true, value: v };
}

function initialValidAvg(): number {
  const r = parseAverageInputStrict(props.defaultValue);
  return r.ok ? r.value : 0.45;
}

const avgInput = ref(props.defaultValue);
const lastValidAvg = ref(initialValidAvg());
/** 与 `lastValidAvg` 同一次提交的平均值输入原文（区分 0.9 与 0.90）。 */
const lastSubmittedRaw = ref(props.defaultValue);
const fieldError = ref('');

const counts = computed(() => getPossibleCounts(lastValidAvg.value, props.mode, 40, lastSubmittedRaw.value.trim() || undefined));

const resultText = computed(() => {
  if (fieldError.value) {
    return '—（请先修正上方输入）';
  }
  const list = counts.value;
  if (list.length === 0) {
    return '无（该显示值在规则下可能没有整数解；请核对是否抄错，或是否选对了本模块对应的「截断 / 四舍五入」）';
  }
  return list.join('，');
});

function submit(): void {
  const r = parseAverageInputStrict(avgInput.value);
  if (!r.ok) {
    fieldError.value = r.message;
    return;
  }
  fieldError.value = '';
  lastValidAvg.value = r.value;
  lastSubmittedRaw.value = avgInput.value.trim();
}
</script>

<template>
  <section class="inner-section">
    <h2>{{ title }}</h2>
    <p v-if="fieldError" class="input-field-error" role="alert">{{ fieldError }}</p>
    <div class="inline-form">
      <label>{{ inputLabel }}：</label>
      <input v-model="avgInput" type="text" inputmode="decimal" autocomplete="off" />
      <button type="button" @click="submit">计算</button>
    </div>
    <div class="result-box">
      <strong>可能的数量：</strong>
      {{ resultText }}
    </div>
  </section>
</template>
