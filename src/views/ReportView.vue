<template>
  <section class="report-view">
    <article class="report-card hero-card">
      <div class="card-header">
        <div>
          <p class="eyebrow">AI 추천</p>
          <h2 class="card-title">
            한 눈에 보는 {{ reportMonthLabel }} 나의 소비 패턴
          </h2>
        </div>
        <span class="prompt-badge">소비 패턴</span>
      </div>

      <p class="prompt-text">
        {{ uiDescriptions.overview }}
      </p>

      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner" />
        <p class="loading-text">AI가 이번 달 소비 패턴을 분석하고 있어요.</p>
      </div>

      <div v-else class="hero-content">
        <div class="donut-panel">
          <div class="donut-chart-wrapper">
            <div class="donut-chart">
              <div
                v-for="category in expenseCategories"
                :key="category.categoryId"
                class="donut-segment"
                :class="{
                  'is-active': hoveredCategoryId === category.categoryId,
                  'is-muted':
                    hoveredCategoryId &&
                    hoveredCategoryId !== category.categoryId,
                }"
                :style="getDonutSegmentStyle(category)"
                @mouseenter="hoveredCategoryId = category.categoryId"
                @mouseleave="hoveredCategoryId = null"
              />

              <div class="donut-hole">
                <strong>{{ formatCurrency(totalExpense) }}</strong>
                <span>총 지출</span>
              </div>
            </div>
          </div>

          <ul class="legend-list">
            <li
              v-for="category in expenseCategories"
              :key="category.categoryId"
              class="legend-item"
              :class="{
                'is-active': hoveredCategoryId === category.categoryId,
                'is-muted':
                  hoveredCategoryId &&
                  hoveredCategoryId !== category.categoryId,
              }"
              @mouseenter="hoveredCategoryId = category.categoryId"
              @mouseleave="hoveredCategoryId = null"
            >
              <span
                class="legend-color"
                :style="{ backgroundColor: category.color }"
              />
              <span class="legend-name">{{ category.label }}</span>
              <span class="legend-percent">{{ category.share }}%</span>
            </li>
          </ul>
        </div>

        <div class="summary-panel">
          <p
            v-for="sentence in overviewSummary"
            :key="sentence"
            class="summary-line"
          >
            {{ sentence }}
          </p>
        </div>
      </div>
    </article>

    <div class="grid-row">
      <article class="report-card savings-card">
        <div class="card-header">
          <div>
            <p class="eyebrow">AI 추천</p>
            <h2 class="card-title">카테고리별 절약 가이드</h2>
          </div>
          <span class="prompt-badge">절약 가이드</span>
        </div>

        <p class="prompt-text">
          {{ uiDescriptions.savings }}
        </p>

        <div v-if="isLoading" class="loading-state">
          <div class="loading-spinner" />
          <p class="loading-text">AI가 절약 가능한 지출을 계산하고 있어요.</p>
        </div>

        <div v-else class="bar-list">
          <div
            v-for="item in savingsRecommendations"
            :key="item.categoryId"
            class="bar-item"
          >
            <div class="bar-meta">
              <span>{{ item.label }}</span>
              <strong>{{ formatCurrency(item.expectedSavings) }}</strong>
            </div>
            <div class="bar-track">
              <div
                class="bar-fill"
                :style="{
                  width: `${item.barWidth}%`,
                  backgroundColor: item.color,
                }"
              />
            </div>
            <p class="bar-description">
              {{ item.tip }}
            </p>
          </div>
        </div>
      </article>

      <article class="report-card forecast-card">
        <div class="card-header">
          <div>
            <p class="eyebrow">AI 추천</p>
            <h2 class="card-title">다음 달 지출 예상</h2>
          </div>
          <span class="prompt-badge">지출 예상</span>
        </div>

        <p class="prompt-text">
          {{ uiDescriptions.forecast }}
        </p>

        <div v-if="isLoading" class="loading-state">
          <div class="loading-spinner" />
          <p class="loading-text">AI가 다음 달 지출을 예측하고 있어요.</p>
        </div>

        <template v-else>
          <div class="forecast-total">
            <span>예상 총지출</span>
            <strong>{{ formatCurrency(nextMonthForecast.totalSpend) }}</strong>
            <small>
              이번 달 대비
              {{ nextMonthForecast.deltaText }}
            </small>
          </div>

          <div class="forecast-list">
            <p
              v-for="sentence in nextMonthForecast.summary"
              :key="sentence"
              class="forecast-line"
            >
              {{ sentence }}
            </p>
          </div>
        </template>
      </article>
    </div>
  </section>
</template>

<script setup>
import { onMounted, onUnmounted, reactive, ref, toRefs } from 'vue';
import { getReportData, REPORT_UI_DESCRIPTIONS } from '@/services/report';

// 도넛 차트는 CSS clip-path로 직접 그리기 때문에 기준 좌표를 고정
const DONUT_CANVAS_SIZE = 248;
const DONUT_CENTER = DONUT_CANVAS_SIZE / 2;
const DONUT_BASE_OUTER_RADIUS = 100;
const DONUT_HOVER_OUTER_RADIUS = 108;
const DONUT_INNER_RADIUS = 62;

const uiDescriptions = REPORT_UI_DESCRIPTIONS;
const hoveredCategoryId = ref(null);
const isLoading = ref(true);

// 서비스에서 받아온 리포트 데이터를 화면에서 바로 쓸 수 있게 한 곳에 모아둠
const reportState = reactive({
  reportMonthLabel: '',
  expenseCategories: [],
  totalExpense: 0,
  overviewSummary: [],
  savingsRecommendations: [],
  nextMonthForecast: {
    totalSpend: 0,
    deltaText: '',
    summary: [],
  },
});

const {
  expenseCategories,
  nextMonthForecast,
  overviewSummary,
  reportMonthLabel,
  savingsRecommendations,
  totalExpense,
} = toRefs(reportState);

let isViewActive = true;

onMounted(async () => {
  try {
    const data = await getReportData();

    if (!isViewActive) {
      return;
    }

    Object.assign(reportState, data);
  } catch (error) {
    console.error('Failed to load report data.', error);
  } finally {
    if (isViewActive) {
      isLoading.value = false;
    }
  }
});

onUnmounted(() => {
  isViewActive = false;
});

function getDonutSegmentStyle(category) {
  // hover된 조각만 살짝 키워서 범례와 함께 강조
  const outerRadius =
    hoveredCategoryId.value === category.categoryId
      ? DONUT_HOVER_OUTER_RADIUS
      : DONUT_BASE_OUTER_RADIUS;
  const scale = hoveredCategoryId.value === category.categoryId ? 1.03 : 1;

  return {
    backgroundColor: category.color,
    clipPath: `path('${createArcPath(
      category.startAngle,
      category.endAngle,
      DONUT_INNER_RADIUS,
      outerRadius,
    )}')`,
    transform: `scale(${scale})`,
  };
}

function formatCurrency(value) {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value);
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function createArcPath(startAngle, endAngle, innerRadius, outerRadius) {
  // 도넛 한 조각을 SVG path 문자열처럼 계산해서 clip-path로
  const centerX = DONUT_CENTER;
  const centerY = DONUT_CENTER;
  const startOuter = polarToCartesian(
    centerX,
    centerY,
    outerRadius,
    startAngle,
  );
  const endOuter = polarToCartesian(centerX, centerY, outerRadius, endAngle);
  const startInner = polarToCartesian(
    centerX,
    centerY,
    innerRadius,
    startAngle,
  );
  const endInner = polarToCartesian(centerX, centerY, innerRadius, endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${startInner.x} ${startInner.y}`,
    'Z',
  ].join(' ');
}
</script>

<style scoped>
.report-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
  color: #202020;
}

.grid-row {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(280px, 1fr);
  gap: 24px;
}

.report-card {
  background: #ffffff;
  border-radius: 17px;
  padding: 24px 28px;
  box-shadow: 0 10px 30px rgba(17, 24, 39, 0.06);
  border: 1px solid #ececf1;
}

.hero-card {
  min-height: 320px;
}

.savings-card,
.forecast-card {
  min-height: 360px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 12px;
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 700;
  color: #6b7280;
}

.card-title {
  margin: 0;
  font-size: 26px;
  line-height: 1.3;
  font-weight: 800;
}

.prompt-badge {
  flex-shrink: 0;
  padding: 7px 12px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #4b5563;
  font-size: 12px;
  font-weight: 700;
}

.prompt-text {
  margin: 0 0 22px;
  color: #5f6673;
  font-size: 14px;
  line-height: 1.7;
}

.hero-content {
  display: grid;
  grid-template-columns: minmax(300px, 0.82fr) minmax(0, 1.18fr);
  gap: 20px;
  align-items: start;
  overflow: visible;
}

.donut-panel {
  display: flex;
  align-items: center;
  gap: 24px;
  overflow: visible;
  min-width: 0;
}

.donut-chart-wrapper {
  width: 260px;
  height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: visible;
}

.donut-chart {
  width: 248px;
  height: 248px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: visible;
}

.donut-segment {
  position: absolute;
  inset: 0;
  transition:
    transform 0.22s ease,
    opacity 0.22s ease,
    filter 0.22s ease;
  transform-origin: center;
  cursor: pointer;
}

.donut-segment.is-active {
  z-index: 2;
  filter: brightness(1.04);
}

.donut-segment.is-muted {
  opacity: 0.42;
}

.donut-hole {
  width: 106px;
  height: 106px;
  border-radius: 50%;
  background: #ffffff;
  position: relative;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  box-shadow: inset 0 0 0 1px #f1f1f3;
}

.donut-hole strong {
  font-size: 18px;
  font-weight: 800;
}

.donut-hole span {
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
}

.legend-list {
  list-style: none;
  margin: 0;
  padding: 0;
  min-width: 120px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.legend-item {
  display: grid;
  grid-template-columns: 14px 1fr auto;
  align-items: center;
  column-gap: 10px;
  font-size: 14px;
  padding: 8px 10px;
  border-radius: 12px;
  transition:
    background-color 0.2s ease,
    transform 0.2s ease,
    opacity 0.2s ease;
  cursor: pointer;
}

.legend-item.is-active {
  background: #f3f4f6;
  transform: translateX(4px);
}

.legend-item.is-muted {
  opacity: 0.45;
}

.legend-color {
  width: 14px;
  height: 14px;
  border-radius: 50%;
}

.legend-name {
  color: #374151;
  font-weight: 600;
}

.legend-percent {
  color: #111827;
  font-weight: 700;
}

.summary-panel,
.forecast-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.summary-panel {
  justify-content: flex-start;
  justify-self: start;
  align-self: start;
  width: 100%;
  max-width: 760px;
  padding-top: 12px;
}

.summary-line,
.forecast-line,
.bar-description {
  margin: 0;
  font-size: 16px;
  line-height: 1.8;
  color: #202020;
}

.bar-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.bar-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bar-meta {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
}

.bar-track {
  width: 100%;
  height: 12px;
  border-radius: 999px;
  background: #eceff3;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: inherit;
}

.forecast-total {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
  padding: 18px 20px;
  border-radius: 17px;
  background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
}

.forecast-total span,
.forecast-total small {
  color: #4b5563;
}

.forecast-total strong {
  font-size: 30px;
  line-height: 1.2;
  color: #111827;
}

.loading-state {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
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
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1200px) {
  .hero-content,
  .grid-row {
    grid-template-columns: 1fr;
  }

  .forecast-card {
    min-height: auto;
  }
}

@media (max-width: 1360px) {
  .hero-content {
    grid-template-columns: 1fr;
    align-items: center;
    justify-items: center;
  }

  .donut-panel {
    justify-content: center;
  }

  .summary-panel {
    width: 100%;
    max-width: 720px;
    align-items: center;
    text-align: center;
  }
}

@media (max-width: 760px) {
  .report-card {
    padding: 20px;
  }

  .card-title {
    font-size: 22px;
  }

  .donut-panel {
    flex-direction: column;
    align-items: flex-start;
  }

  .legend-list {
    width: 100%;
  }

  .donut-chart-wrapper {
    width: 248px;
    height: 248px;
  }

  .summary-line,
  .forecast-line,
  .bar-description {
    font-size: 15px;
  }
}
</style>
