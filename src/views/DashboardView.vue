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

        <div
          v-if="card.waveType"
          class="summary-wave-base"
          aria-hidden="true"
        />
      </article>

      <article
        class="panel-card panel-card--small panel-card--monthly"
        role="link"
        tabindex="0"
        @click="goToMonthly"
        @keydown.enter.prevent="goToMonthly"
        @keydown.space.prevent="goToMonthly"
      >
        <div class="panel-shell panel-shell--monthly">
          <div
            v-if="isMonthlySummaryLoading"
            class="loading-state dashboard-loading-state"
          >
            <div class="loading-spinner" />
            <p class="loading-text">월별 재정요약을 불러오고 있어요.</p>
          </div>

          <template v-else-if="monthlyCategories.length">
            <p class="monthly-title">월별 요약</p>

            <div class="monthly-preview">
              <div class="monthly-donut" :style="monthlyChartStyle" />

              <div class="monthly-legend">
                <div
                  v-for="category in monthlyPreviewCategories"
                  :key="category.id"
                  class="monthly-legend-item"
                >
                  <span
                    class="monthly-legend-dot"
                    :style="{ backgroundColor: category.color }"
                  />
                  <span class="monthly-legend-name">{{ category.name }}</span>
                  <span class="monthly-legend-value"
                    >{{ category.share }}%</span
                  >
                </div>
              </div>
            </div>
          </template>

          <div v-else class="panel-placeholder panel-placeholder--insight">
            월별 요약
          </div>
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
          <div
            v-if="isAiReportLoading"
            class="loading-state dashboard-loading-state"
          >
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
      <article class="panel-card panel-card--large panel-card--transactions">
        <div class="panel-shell panel-shell--large panel-shell--transactions">
          <div class="transactions-preview-header">
            <p class="transactions-preview-title">거래 내역</p>
          </div>

          <div
            v-if="isTransactionsLoading"
            class="loading-state dashboard-loading-state dashboard-transactions-loading"
          >
            <div class="loading-spinner" />
            <p class="loading-text">거래 내역을 불러오고 있어요.</p>
          </div>

          <div
            v-else-if="recentTransactions.length"
            class="transactions-table-scroll"
          >
            <table class="dashboard-transaction-table">
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>카테고리</th>
                  <th>메모</th>
                  <th class="align-right">금액</th>
                  <th>유형</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="transaction in recentTransactions"
                  :key="transaction.id"
                  class="dashboard-transaction-row"
                  @click="goToTransactionDetail(transaction.id)"
                >
                  <td>{{ formatTransactionDate(transaction.date) }}</td>
                  <td>
                    <span
                      class="dashboard-category-badge"
                      :style="{
                        backgroundColor: getCategoryColor(
                          transaction.categoryId,
                        ),
                      }"
                    >
                      {{ getCategoryLabel(transaction.categoryId) }}
                    </span>
                  </td>
                  <td class="dashboard-memo-cell">
                    {{ transaction.memo || transaction.place || '거래 내역' }}
                  </td>
                  <td
                    class="align-right dashboard-price-cell"
                    :class="
                      transaction.type === 'income'
                        ? 'dashboard-income'
                        : 'dashboard-expense'
                    "
                  >
                    ₩ {{ formatPrice(transaction.price) }}
                  </td>
                  <td>
                    <span
                      class="dashboard-type-badge"
                      :class="
                        transaction.type === 'income'
                          ? 'dashboard-income'
                          : 'dashboard-expense'
                      "
                    >
                      {{ transaction.type === 'income' ? '수입' : '지출' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="panel-placeholder panel-placeholder--large">
            거래내역
          </div>
        </div>
      </article>

      <article
        class="panel-card panel-card--large panel-card--map"
        role="link"
        tabindex="0"
        @click="goToMap"
        @keydown.enter.prevent="goToMap"
        @keydown.space.prevent="goToMap"
      >
        <div class="panel-shell panel-shell--large panel-shell--map">
          <div class="map-preview-header">
            <div>
              <p class="map-preview-title">소비 지도</p>
              <p class="map-preview-caption">
                최근 소비 위치를 지도에서 빠르게 볼 수 있어요.
              </p>
            </div>
          </div>

          <div
            v-if="hasMapPreviewError || !mapPreviewTransactions.length"
            class="panel-placeholder panel-placeholder--large"
          >
            소비 지도
          </div>

          <div v-else class="dashboard-map-frame">
            <div ref="dashboardMapRef" class="dashboard-map" />
            <div v-if="isMapPreviewLoading" class="dashboard-map-overlay">
              <div class="loading-state dashboard-map-loading">
                <div class="loading-spinner" />
                <p class="loading-text">소비 지도를 불러오고 있어요.</p>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import sourceData from '../../data.json';

import { getReportData } from '@/services/report';
import { useCategoryStore } from '@/stores/category';
import { useMonthlyStore } from '@/stores/monthly';
import { useTransactionsStore } from '@/stores/transactions';
import { loadKakaoScript } from '@/utils/kakaoMap';

const targetMonth =
  sourceData.meta?.latestMonthInProgress ?? sourceData.meta?.latestClosedMonth;
const fallbackLatestCashflow =
  sourceData.monthlyCashflow.find((item) => item.yearMonth === targetMonth) ??
  sourceData.monthlyCashflow[sourceData.monthlyCashflow.length - 1];
const aiReportPreview = ref([]);
const isAiReportLoading = ref(true);
const isMonthlySummaryLoading = ref(true);
const isMapPreviewLoading = ref(true);
const isTransactionsLoading = ref(true);
const hasMapPreviewError = ref(false);
const dashboardMapRef = ref(null);
const dashboardMap = ref(null);
const dashboardMapMarkers = ref([]);
const router = useRouter();
const categoryStore = useCategoryStore();
const monthlyStore = useMonthlyStore();
const transactionsStore = useTransactionsStore();
const latestCashflow = computed(
  () => monthlyStore.currentMonthData ?? fallbackLatestCashflow,
);
const reportMonthLabel = computed(() =>
  formatMonth(latestCashflow.value.yearMonth),
);
const currentDateLabel = formatCurrentDate();

const categoryColorMap = Object.fromEntries(
  sourceData.categories.map((category) => [
    category.id,
    category.color?.startsWith('#') ? category.color : `#${category.color}`,
  ]),
);

const categoryLabelMap = Object.fromEntries(
  sourceData.categories.map((category) => [category.id, category.labelKo]),
);

const dashboardCaption = computed(() => {
  if (latestCashflow.value.isPartialMonth) {
    return `${currentDateLabel} 기준`;
  }

  return `${reportMonthLabel.value} 기준`;
});

const summaryCards = computed(() => [
  {
    label: '수입',
    badge: '이번 달',
    value: formatCurrency(latestCashflow.value.totalIncome),
    meta: `${reportMonthLabel.value} 누적 수입`,
    tone: 'tone-income',
    waveType: 'income',
    waveFillPath:
      'M0 62 C16 56 30 48 44 46 C58 44 66 66 80 58 C96 48 112 38 128 44 C144 50 160 42 176 32 C192 22 208 14 224 20 C238 26 250 18 260 12 L260 84 L0 84 Z',
  },
  {
    label: '지출',
    badge: '이번 달',
    value: formatCurrency(latestCashflow.value.totalSpend),
    meta: `${reportMonthLabel.value} 누적 지출`,
    tone: 'tone-expense',
    waveType: 'expense',
    waveFillPath:
      'M0 16 C16 14 32 18 46 28 C60 38 74 56 88 52 C104 48 120 36 136 40 C152 44 168 56 184 58 C200 60 216 48 232 42 C244 38 254 42 260 46 L260 84 L0 84 Z',
  },
  {
    label: '잔액',
    badge: '이번 달',
    value: formatCurrency(latestCashflow.value.totalCashflow),
    meta: latestCashflow.value.isPartialMonth
      ? `${currentDateLabel} 기준 잔액`
      : '수입 - 지출',
    tone: 'tone-balance',
  },
]);

const monthlyCategories = computed(() =>
  [...monthlyStore.categories]
    .filter((category) => category.amount > 0)
    .sort((left, right) => right.amount - left.amount),
);

const monthlyPreviewCategories = computed(() =>
  monthlyCategories.value.slice(0, 3).map((category) => ({
    ...category,
    share: Math.round((category.amount / monthlyStore.expense) * 100),
  })),
);

const monthlyChartStyle = computed(() => {
  if (!monthlyCategories.value.length || !monthlyStore.expense) {
    return {};
  }

  let accumulated = 0;
  const gradientParts = monthlyCategories.value.map((category) => {
    const start = accumulated;
    const end = start + (category.amount / monthlyStore.expense) * 100;
    accumulated = end;
    return `${category.color} ${start}% ${end}%`;
  });

  return {
    background: `conic-gradient(${gradientParts.join(', ')})`,
  };
});

const liveTransactions = computed(() =>
  transactionsStore.transactions.length > 0
    ? transactionsStore.transactions
    : sourceData.transactions,
);

const recentTransactions = computed(() =>
  [...transactionsStore.transactions].sort((left, right) => {
    const dateCompare = String(right.date).localeCompare(String(left.date));

    if (dateCompare !== 0) {
      return dateCompare;
    }

    return String(right.id).localeCompare(String(left.id));
  }),
);

const mapPreviewTransactions = computed(() =>
  [...liveTransactions.value]
    .filter(
      (item) =>
        item.type === 'expense' &&
        item.date.startsWith(latestCashflow.value.yearMonth) &&
        item.location?.lat &&
        item.location?.lng,
    )
    .sort((left, right) => {
      const leftKey = `${left.date}-${String(left.id)}`;
      const rightKey = `${right.date}-${String(right.id)}`;
      return rightKey.localeCompare(leftKey);
    })
    .slice(0, 6),
);

const mapFocusTransactions = computed(() => {
  if (!mapPreviewTransactions.value.length) {
    return [];
  }

  const anchor = mapPreviewTransactions.value[0].location;
  const maxLatDiff = 0.015;
  const maxLngDiff = 0.02;

  const nearbyTransactions = mapPreviewTransactions.value.filter(
    (transaction) => {
      const latDiff = Math.abs(transaction.location.lat - anchor.lat);
      const lngDiff = Math.abs(transaction.location.lng - anchor.lng);

      return latDiff <= maxLatDiff && lngDiff <= maxLngDiff;
    },
  );

  return nearbyTransactions.length > 0
    ? nearbyTransactions
    : [mapPreviewTransactions.value[0]];
});

onMounted(async () => {
  const reportPromise = getReportData()
    .then((reportData) => {
      aiReportPreview.value = reportData.overviewSummary.slice(1, 3);
    })
    .catch((error) => {
      console.error('Failed to load dashboard AI report preview.', error);
      aiReportPreview.value = [];
    })
    .finally(() => {
      isAiReportLoading.value = false;
    });

  const monthlyPromise = monthlyStore
    .fetchAll()
    .catch((error) => {
      console.error('Failed to load dashboard monthly summary preview.', error);
    })
    .finally(() => {
      isMonthlySummaryLoading.value = false;
    });

  const categoriesPromise = categoryStore.fetchCategories().catch((error) => {
    console.error('Failed to load dashboard categories preview.', error);
  });

  const mapPromise = nextTick()
    .then(() => initDashboardMapPreview())
    .catch((error) => {
      console.error('Failed to load dashboard map preview.', error);
      hasMapPreviewError.value = true;
    })
    .finally(() => {
      isMapPreviewLoading.value = false;
    });

  const transactionsPromise = transactionsStore
    .fetchTransactions()
    .catch((error) => {
      console.error('Failed to load dashboard transactions preview.', error);
    })
    .finally(() => {
      isTransactionsLoading.value = false;
    });

  await Promise.allSettled([
    reportPromise,
    monthlyPromise,
    categoriesPromise,
    mapPromise,
    transactionsPromise,
  ]);
});

onUnmounted(() => {
  clearDashboardMapMarkers();
  dashboardMap.value = null;
});

function goToReport() {
  router.push('/report');
}

function goToMonthly() {
  router.push('/monthly');
}

function goToMap() {
  router.push('/map');
}

function goToTransactionDetail(transactionId) {
  router.push(`/transactions/${transactionId}`);
}

async function initDashboardMapPreview() {
  if (!dashboardMapRef.value || !mapFocusTransactions.value.length) {
    return;
  }

  await loadKakaoScript();

  await new Promise((resolve) => {
    window.kakao.maps.load(resolve);
  });

  if (!dashboardMapRef.value) {
    return;
  }

  const initialItem = mapFocusTransactions.value[0];

  dashboardMap.value = new window.kakao.maps.Map(dashboardMapRef.value, {
    center: new window.kakao.maps.LatLng(
      initialItem.location.lat,
      initialItem.location.lng,
    ),
    level: 6,
    draggable: false,
    scrollwheel: false,
    disableDoubleClick: true,
    disableDoubleClickZoom: true,
  });

  await new Promise((resolve) => {
    window.setTimeout(() => {
      if (!dashboardMap.value) {
        resolve();
        return;
      }

      dashboardMap.value.relayout();
      window.kakao.maps.event.trigger(dashboardMap.value, 'resize');
      renderDashboardMapPreview();
      resolve();
    }, 300);
  });
}

function renderDashboardMapPreview() {
  if (
    !dashboardMap.value ||
    !window.kakao?.maps ||
    !mapFocusTransactions.value.length
  ) {
    return;
  }

  clearDashboardMapMarkers();

  const bounds = new window.kakao.maps.LatLngBounds();

  mapFocusTransactions.value.forEach((transaction) => {
    const position = new window.kakao.maps.LatLng(
      transaction.location.lat,
      transaction.location.lng,
    );

    const marker = new window.kakao.maps.Marker({
      map: dashboardMap.value,
      position,
      image: createDashboardMarkerImage(
        categoryColorMap[transaction.categoryId] ?? '#4474FF',
      ),
    });

    dashboardMapMarkers.value.push(marker);
    bounds.extend(position);
  });

  dashboardMap.value.setBounds(bounds);

  if (mapFocusTransactions.value.length === 1) {
    const onlyItem = mapFocusTransactions.value[0];
    dashboardMap.value.setLevel(4);
    dashboardMap.value.panTo(
      new window.kakao.maps.LatLng(
        onlyItem.location.lat,
        onlyItem.location.lng,
      ),
    );
    return;
  }

  const anchor = mapFocusTransactions.value[0];
  dashboardMap.value.setLevel(Math.min(dashboardMap.value.getLevel(), 5));
  dashboardMap.value.panTo(
    new window.kakao.maps.LatLng(anchor.location.lat, anchor.location.lng),
  );
}

function clearDashboardMapMarkers() {
  dashboardMapMarkers.value.forEach((marker) => marker.setMap(null));
  dashboardMapMarkers.value = [];
}

function createDashboardMarkerImage(color) {
  const svg = `
    <svg width="44" height="56" viewBox="0 0 44 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 55C22 55 40 36.8 40 22C40 10.4 31.6 2 22 2C12.4 2 4 10.4 4 22C4 36.8 22 55 22 55Z" fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="22" cy="22" r="10" fill="white"/>
      <circle cx="22" cy="22" r="4" fill="${color}"/>
    </svg>
  `.trim();

  return new window.kakao.maps.MarkerImage(
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    new window.kakao.maps.Size(44, 56),
    { offset: new window.kakao.maps.Point(22, 56) },
  );
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

function formatCurrentDate() {
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';

  return `${year}년 ${month}월 ${day}일`;
}

function getCategoryLabel(categoryId) {
  return (
    categoryStore.getCategoryById(categoryId)?.labelKo ??
    categoryLabelMap[categoryId] ??
    categoryId ??
    '기타'
  );
}

function getCategoryColor(categoryId) {
  const rawColor =
    categoryStore.getCategoryById(categoryId)?.color ??
    categoryColorMap[categoryId] ??
    '#cccccc';

  return rawColor?.startsWith?.('#') ? rawColor : `#${rawColor}`;
}

function formatTransactionDate(date) {
  if (!date) {
    return '';
  }

  const [, month, day] = String(date).split('-');
  return `${Number(month)}월 ${Number(day)}일`;
}

function formatPrice(value) {
  return Number(value || 0).toLocaleString('ko-KR');
}
</script>

<style scoped>
.dashboard-view {
  --dashboard-large-panel-height: 452px;
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

.panel-card--monthly {
  align-items: stretch;
  justify-content: flex-start;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.panel-card--monthly:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
  border-color: #d9dde5;
}

.panel-card--monthly:focus-visible {
  outline: 3px solid rgba(59, 130, 246, 0.25);
  outline-offset: 2px;
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
  height: var(--dashboard-large-panel-height);
  align-items: stretch;
  overflow: hidden;
}

.panel-card--transactions {
  height: var(--dashboard-large-panel-height);
}

.panel-card--map {
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.panel-card--map:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
  border-color: #d9dde5;
}

.panel-card--map:focus-visible {
  outline: 3px solid rgba(59, 130, 246, 0.25);
  outline-offset: 2px;
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

.panel-shell--monthly {
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 18px 20px;
}

.monthly-title {
  margin: 0 0 16px;
  font-size: 18px;
  line-height: 1.25;
  font-weight: 800;
  color: #111827;
  text-align: center;
}

.monthly-preview {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
}

.monthly-donut {
  position: relative;
  flex-shrink: 0;
  width: 94px;
  height: 94px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.12);
}

.monthly-donut::after {
  content: '';
  position: absolute;
  inset: 16px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: inset 0 0 0 1px rgba(226, 232, 240, 0.9);
}

.monthly-legend {
  min-width: 132px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.monthly-legend-item {
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
}

.monthly-legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.monthly-legend-name {
  min-width: 0;
  font-size: 13px;
  line-height: 1.4;
  font-weight: 700;
  color: #374151;
}

.monthly-legend-value {
  font-size: 13px;
  line-height: 1.4;
  font-weight: 800;
  color: #111827;
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
  min-height: 0;
  height: 100%;
}

.panel-shell--map {
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  padding: 18px;
  gap: 16px;
  min-height: 0;
  height: 100%;
}

.panel-shell--transactions {
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  padding: 18px;
  gap: 16px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.transactions-preview-header {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
}

.transactions-preview-title {
  margin: 0;
  font-size: 20px;
  line-height: 1.25;
  font-weight: bold;
  color: #111827;
}

.dashboard-transactions-loading {
  min-height: 280px;
}

.transactions-table-scroll {
  width: 100%;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.transactions-table-scroll::-webkit-scrollbar {
  width: 10px;
}

.transactions-table-scroll::-webkit-scrollbar-track {
  background: #ffffff;
  border-radius: 999px;
}

.transactions-table-scroll::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 999px;
  border: 2px solid #ffffff;
}

.transactions-table-scroll {
  scrollbar-width: thin;
  scrollbar-color: #d1d5db #ffffff;
}

.dashboard-transaction-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.dashboard-transaction-table th:nth-child(1) {
  width: 118px;
  text-align: left;
}

.dashboard-transaction-table th:nth-child(2) {
  width: 102px;
  text-align: left;
}

.dashboard-transaction-table th:nth-child(3) {
  width: auto;
  text-align: left;
}

.dashboard-transaction-table th:nth-child(4) {
  width: 150px;
  text-align: right;
}

.dashboard-transaction-table th:nth-child(5) {
  width: 90px;
  text-align: center;
}

.dashboard-transaction-table thead {
  background-color: #f8f9fa;
}

.dashboard-transaction-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 12px 16px;
  font-weight: 600;
  color: #555555;
  border-bottom: 2px solid #e0e0e0;
  background-color: #f8f9fa;
}

.dashboard-transaction-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: middle;
  white-space: nowrap;
}

.dashboard-transaction-table td:last-child {
  text-align: center;
}

.dashboard-transaction-row {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.dashboard-transaction-row:hover {
  background-color: #f8f9fa;
}

.align-right {
  text-align: right;
}

.dashboard-memo-cell {
  color: #555555;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dashboard-category-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  color: #ffffff;
  font-weight: 500;
}

.dashboard-price-cell {
  font-weight: 600;
  text-align: right;
}

.dashboard-price-cell.dashboard-income {
  color: #0f9f85;
}

.dashboard-price-cell.dashboard-expense {
  color: #d45d78;
}

.dashboard-type-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.dashboard-type-badge.dashboard-income {
  background-color: #d4edda;
  color: #0f9f85;
}

.dashboard-type-badge.dashboard-expense {
  background-color: #f8d7da;
  color: #d45d78;
}

.map-preview-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.map-preview-title {
  margin: 0 0 6px;
  font-size: 18px;
  line-height: 1.25;
  font-weight: 800;
  color: #111827;
}

.map-preview-caption {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: #6b7280;
}

.dashboard-map-loading {
  min-height: 100%;
}

.dashboard-map-frame {
  flex: 1;
  min-height: 0;
  height: auto;
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid #d8dee8;
  background: #eef2f7;
  position: relative;
  pointer-events: none;
}

.dashboard-map {
  width: 100%;
  height: 100%;
}

.dashboard-map-overlay {
  position: absolute;
  inset: 0;
  background: rgba(245, 247, 250, 0.92);
  backdrop-filter: blur(2px);
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

  .dashboard-view {
    --dashboard-large-panel-height: 280px;
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

  .map-preview-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .dashboard-transaction-table {
    min-width: 640px;
  }

  .transactions-table-scroll {
    overflow-x: auto;
  }

  .dashboard-map-frame {
    height: 260px;
    min-height: 260px;
  }

  .monthly-preview {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .monthly-legend {
    align-items: center;
  }

  .monthly-legend-item {
    grid-template-columns: 12px auto auto;
  }
}
</style>
