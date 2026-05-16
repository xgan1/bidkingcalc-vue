<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import CountInferenceSection from './components/CountInferenceSection.vue';
import GameEstimatorSection from './components/GameEstimatorSection.vue';
import AboutSection from './components/AboutSection.vue';

/** 根布局：页签切换、主题；业务在子组件与 `src/utils/calculators.ts`。 */

type ModuleTab = 'victor' | 'ahmed' | 'about';
const activeTab = ref<ModuleTab>('victor');

type ThemeMode = 'light' | 'dark';
const themeMode = ref<ThemeMode>('light');

onMounted(() => {
  const storedTheme = localStorage.getItem('theme-mode');
  if (storedTheme === 'light' || storedTheme === 'dark') {
    themeMode.value = storedTheme;
    return;
  }

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  themeMode.value = prefersDark ? 'dark' : 'light';
});

watch(
  themeMode,
  (value) => {
    document.documentElement.setAttribute('data-theme', value);
    localStorage.setItem('theme-mode', value);
  },
  { immediate: true },
);

function toggleTheme(): void {
  themeMode.value = themeMode.value === 'light' ? 'dark' : 'light';
}
</script>

<template>
  <main class="container">
    <header class="page-header">
      <h1>竞拍之王计算器</h1>
      <div class="header-actions">
        <button type="button" class="theme-toggle" @click="toggleTheme">
          {{ themeMode === 'dark' ? '浅色主题' : '深色主题' }}
        </button>
      </div>
    </header>

    <div class="tab-bar" role="tablist" aria-label="模块切换">
      <button
        type="button"
        class="tab-btn"
        role="tab"
        :aria-selected="activeTab === 'victor'"
        :class="{ active: activeTab === 'victor' }"
        @click="activeTab = 'victor'"
      >
        <span class="tab-label tab-label--short">老头</span>
        <span class="tab-label tab-label--long">维克托（老头）</span>
      </button>
      <button
        type="button"
        class="tab-btn"
        role="tab"
        :aria-selected="activeTab === 'ahmed'"
        :class="{ active: activeTab === 'ahmed' }"
        @click="activeTab = 'ahmed'"
      >
        <span class="tab-label tab-label--short">石油王</span>
        <span class="tab-label tab-label--long">艾哈迈德（石油王）</span>
      </button>
      <button
        type="button"
        class="tab-btn tab-btn--about"
        role="tab"
        :aria-selected="activeTab === 'about'"
        :class="{ active: activeTab === 'about' }"
        @click="activeTab = 'about'"
      >
        说明
      </button>
    </div>

    <section class="panel module-shell">
      <div v-show="activeTab === 'victor'" class="tab-content">
        <h2>维克托（老头）</h2>
        <p class="module-intro">用于根据显示出来的两位小数平均值，反推出可能数量。</p>
        <CountInferenceSection
          title="平均格数（小数点后两位）"
          input-label="平均格数"
          mode="truncate"
        />
        <CountInferenceSection
          title="平均价值（小数点后两位）"
          input-label="平均价值"
          mode="round"
        />
        <p class="victor-hint victor-hint--desktop-only">
          请<strong>按局内写出的小数位原样填写</strong>（<strong>0.9</strong> 与 <strong>0.90</strong>、<strong>0.3</strong> 与 <strong>0.30</strong> 规则不同）。
          对 1～40 逐个检验：须能在截断/四舍五入规则下还原该平均值；若只写出<strong>一位</strong>小数，还须 <strong>平均×件数为整数</strong>（如 <strong>0.3</strong> 不会有 <strong>15</strong>，<strong>0.6</strong> 可有 <strong>5</strong>）。
        </p>
      </div>

      <div v-show="activeTab === 'ahmed'" class="tab-content">
        <GameEstimatorSection />
      </div>

      <div v-show="activeTab === 'about'" class="tab-content tab-content--about">
        <AboutSection />
      </div>
    </section>
  </main>
</template>
