<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import CountInferenceSection from './components/CountInferenceSection.vue';
import GameEstimatorSection from './components/GameEstimatorSection.vue';
import AboutSection from './components/AboutSection.vue';

/**
 * 应用入口页面
 *
 * 这里保持“薄”：只负责页面布局与组合组件。
 * - 具体表单交互：在各自组件中
 * - 核心算法：在 `src/utils/calculators.ts`
 */

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
      <div v-if="activeTab === 'victor'" class="tab-content">
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
          平均格数：按两位小数显示、<strong>第三位起直接舍去</strong>（截断）后反推。平均价值：按<strong>两位小数四舍五入</strong>显示后反推。
        </p>
      </div>

      <div v-else-if="activeTab === 'ahmed'" class="tab-content">
        <GameEstimatorSection />
      </div>

      <div v-else-if="activeTab === 'about'" class="tab-content tab-content--about">
        <AboutSection />
      </div>
    </section>
  </main>
</template>
