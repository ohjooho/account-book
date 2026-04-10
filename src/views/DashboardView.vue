<template>
  <section class="dashboard-view">
    <header class="dashboard-header">
      <div>
        <p class="eyebrow">메인 대시보드</p>
        <h2 class="page-title">한 눈에 보는 {{ reportMonthLabel }} 가계부</h2>
      </div>
      <p class="page-caption">
        {{ dashboardCaption }}
      </p>
    </header>

    <div class="summary-grid">
      <article
        v-for="card in summaryCards"
        :key="card.label"
        class="summary-card"
        :class="[card.tone, { 'has-wave': card.waveType }]"
      >
        <div class="summary-main">
          <div class="summary-header">
            <span class="summary-label">{{ card.label }}</span>
            <small class="summary-badge">{{ card.badge }}</small>
          </div>

          <strong class="summary-value">{{ card.value }}</strong>
          <small class="summary-meta">{{ card.meta }}</small>
        </div>

        <svg
          v-if="card.waveType"
          class="summary-wave"
          viewBox="0 0 260 84"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path class="summary-wave-fill" :d="card.waveFillPath" />
        </svg>

        <div v-if="card.waveType" class="summary-wave-base" aria-hidden="true" />
      </article>

      <article class="panel-card panel-card--small">
        <div class="panel-shell">
          <div class="panel-placeholder">월별 요약</div>
        </div>
      </article>

      <article
        class="panel-card panel-card--small panel-card--insight"
        role="link"
        tabindex="0"
        @click="goToReport"
        @keydown.enter.prevent="goToReport"
        @keydown.space.prevent="goToReport"
      >
        <div class="panel-shell panel-shell--insight">
          <div v-if="isAiReportLoading" class="loading-state dashboard-loading-state">
            <div class="loading-spinner" />
            <p class="loading-text">AI가 소비 분석 요약을 불러오고 있어요.</p>
          </div>

          <template v-else>
            <p class="insight-title">AI 소비 분석</p>

            <div v-if="aiReportPreview.length" class="insight-preview">
              <p
                v-for="sentence in aiReportPreview"
                :key="sentence"
                class="insight-line"
              >
                {{ sentence }}
              </p>
            </div>

            <div v-else class="panel-placeholder panel-placeholder--insight">
              AI 소비 분석
            </div>
          </template>
        </div>
      </article>
    </div>

    <div class="content-grid">
      <article class="panel-card panel-card--large">
        <div class="panel-shell panel-shell--large">
          <div class="panel-placeholder panel-placeholder--large">거래내역</div>
        </div>
      </article>

      <article class="panel-card panel-card--large">
        <div class="panel-shell panel-shell--large">
          <div class="panel-placeholder panel-placeholder--large">소비 지도</div>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import sourceData from '../../data2.json';

import { getReportData } from '@/services/report';

const targetMonth =
  sourceData.meta?.latestMonthInProgress ?? sourceData.meta?.latestClosedMonth;
const latestCashflow =
  sourceData.monthlyCashflow.find((item) => item.yearMonth === targetMonth) ??
  sourceData.monthlyCashflow[sourceData.monthlyCashflow.length - 1];

const reportMonthLabel = formatMonth(latestCashflow.yearMonth);
const currentDateLabel = formatDate(sourceData.meta?.currentDate);
const aiReportPreview = ref([]);
const isAiReportLoading = ref(true);
const router = useRouter();

const dashboardCaption = computed(() => {
  if (latestCashflow.isPartialMonth) {
    return `${currentDateLabel} 기준`;
  }

  return `${reportMonthLabel} 기준`;
});

const summaryCards = computed(() => [
  {
    label: '수입',
    badge: '이번 달',
    value: formatCurrency(latestCashflow.totalIncome),
    meta: `${reportMonthLabel} 누적 수입`,
    tone: 'tone-income',
    waveType: 'income',
    waveFillPath:
      'M0 62 C16 56 30 48 44 46 C58 44 66 66 80 58 C96 48 112 38 128 44 C144 50 160 42 176 32 C192 22 208 14 224 20 C238 26 250 18 260 12 L260 84 L0 84 Z',
  },
  {
    label: '지출',
    badge: '이번 달',
    value: formatCurrency(latestCashflow.totalSpend),
    meta: `${reportMonthLabel} 누적 지출`,
    tone: 'tone-expense',
    waveType: 'expense',
    waveFillPath:
      'M0 16 C16 14 32 18 46 28 C60 38 74 56 88 52 C104 48 120 36 136 40 C152 44 168 56 184 58 C200 60 216 48 232 42 C244 38 254 42 260 46 L260 84 L0 84 Z',
  },
  {
    label: '잔액',
    badge: '이번 달',
    value: formatCurrency(latestCashflow.totalCashflow),
    meta: latestCashflow.isPartialMonth
      ? `${currentDateLabel} 기준 잔액`
      : '수입 - 지출',
    tone: 'tone-balance',
  },
]);

onMounted(async () => {
  try {
    const reportData = await getReportData();
    aiReportPreview.value = reportData.overviewSummary.slice(1, 3);
  } catch (error) {
    console.error('Failed to load dashboard AI report preview.', error);
    aiReportPreview.value = [];
  } finally {
    isAiReportLoading.value = false;
  }
});

function goToReport() {
  router.push('/report');
}

function formatCurrency(value) {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMonth(yearMonth) {
  const [year, month] = yearMonth.split('-');
  return `${year}년 ${Number(month)}월`;
}

function formatDate(date) {
  if (!date) {
    return '현재';
  }

  const [year, month, day] = date.split('-');
  return `${year}년 ${Number(month)}월 ${Number(day)}일`;
}
</script>

<style scoped>
.dashboard-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
  color: #1f2937;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 20px;
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 700;
  color: #6b7280;
}

.page-title {
  margin: 0;
  font-size: 30px;
  line-height: 1.2;
  font-weight: 800;
  color: #111827;
}

.page-caption {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #6b7280;
  text-align: right;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 18px;
}

.summary-card,
.panel-card {
  border-radius: 17px;
  background: #ffffff;
  border: 1px solid #ececf1;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.05);
}

.summary-card {
  grid-column: span 2;
  min-height: 144px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  position: relative;
  isolation: isolate;
  overflow: hidden;
  text-align: left;
}

.summary-card.tone-income {
  background: linear-gradient(135deg, #5b9a94 0%, #6cb3ab 100%);
  color: #ffffff;
}

.summary-card.tone-expense {
  background: linear-gradient(135deg, #d96f86 0%, #d45d78 100%);
  color: #ffffff;
}

.summary-card.tone-balance {
  background: linear-gradient(135deg, #fffdfa 0%, #fff6e8 100%);
}

.summary-main {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 34px 18px 18px;
  min-height: 100%;
}

.summary-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.summary-label {
  display: block;
  line-height: 1.2;
  font-size: 15px;
  font-weight: 700;
}

.summary-badge {
  flex-shrink: 0;
  display: block;
  line-height: 1.2;
  font-size: 11px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.76);
}

.summary-value {
  margin-top: 2px;
  font-size: 29px;
  line-height: 1.15;
  font-weight: 800;
}

.summary-meta {
  margin-top: 10px;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.82);
}

.summary-wave {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 24px;
  width: 100%;
  height: 84px;
  z-index: 0;
}

.summary-wave-base {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 24px;
  z-index: 0;
}

.tone-income .summary-wave-fill {
  fill: rgba(141, 229, 222, 0.36);
}

.tone-income .summary-wave-base {
  background: rgba(141, 229, 222, 0.36);
}

.tone-expense .summary-wave-fill {
  fill: rgba(255, 195, 191, 0.38);
}

.tone-expense .summary-wave-base {
  background: rgba(255, 195, 191, 0.38);
}

.tone-balance .summary-meta,
.tone-balance .summary-label,
.tone-balance .summary-value,
.tone-balance .summary-badge {
  color: #111827;
}

.tone-balance .summary-badge {
  color: #8b96a8;
}

.panel-card {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.panel-card--small {
  grid-column: span 3;
  min-height: 144px;
}

.panel-card--insight {
  align-items: stretch;
  justify-content: flex-start;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.panel-card--insight:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
  border-color: #d9dde5;
}

.panel-card--insight:focus-visible {
  outline: 3px solid rgba(59, 130, 246, 0.25);
  outline-offset: 2px;
}

.panel-card--large {
  min-height: 420px;
}

.panel-shell {
  width: 100%;
  min-height: 104px;
  border-radius: 15px;
  border: 1px dashed #d1d5db;
  background: linear-gradient(
    180deg,
    rgba(249, 250, 251, 0.92),
    rgba(243, 244, 246, 0.96)
  );
  display: flex;
  align-items: center;
  justify-content: center;
}

.panel-shell--insight {
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 18px 20px;
}

.insight-preview {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
  justify-content: flex-start;
}

.insight-title {
  margin: 0 0 14px;
  font-size: 18px;
  line-height: 1.25;
  font-weight: 800;
  color: #111827;
}

.insight-line {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #374151;
}

.panel-placeholder--insight {
  width: 100%;
  flex: 1;
}

.loading-state {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.dashboard-loading-state {
  width: 100%;
  min-height: 110px;
  flex: 1;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 4px solid #e5e7eb;
  border-top-color: #111827;
  animation: spin 0.9s linear infinite;
}

.loading-text {
  margin: 0;
  color: #5f6673;
  font-size: 14px;
  text-align: center;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.panel-shell--large {
  min-height: 380px;
}

.panel-placeholder {
  font-size: 24px;
  line-height: 1.2;
  font-weight: 800;
  color: #111827;
  text-align: center;
}

.panel-placeholder--large {
  font-size: 30px;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.9fr) minmax(280px, 1fr);
  gap: 18px;
}

:global(.content-area) {
  scrollbar-width: thin;
  scrollbar-color: #cdd5df #f5f5f7;
}

:global(.content-area::-webkit-scrollbar) {
  width: 12px;
}

:global(.content-area::-webkit-scrollbar-track) {
  background: #f5f5f7;
}

:global(.content-area::-webkit-scrollbar-thumb) {
  background-color: #cdd5df;
  border-radius: 999px;
  border: 3px solid #f5f5f7;
}

@media (max-width: 1480px) {
  .summary-card {
    grid-column: span 3;
  }

  .panel-card--small {
    grid-column: span 6;
  }
}

@media (max-width: 1180px) {
  .dashboard-header,
  .content-grid {
    display: grid;
    grid-template-columns: 1fr;
  }

  .dashboard-header {
    gap: 12px;
  }

  .page-caption {
    text-align: left;
  }
}

@media (max-width: 900px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .summary-card,
  .panel-card--small {
    grid-column: span 1;
  }
}

@media (max-width: 720px) {
  .dashboard-view {
    gap: 18px;
  }

  .page-title {
    font-size: 26px;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .summary-card,
  .panel-card--small {
    grid-column: span 1;
  }

  .panel-card--large {
    min-height: 280px;
  }

  .panel-shell--large {
    min-height: 240px;
  }

  .panel-placeholder {
    font-size: 22px;
  }

  .panel-placeholder--large {
    font-size: 26px;
  }
}
</style>
