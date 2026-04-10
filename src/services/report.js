import axios from 'axios';

// 화면에는 프롬프트 대신 더 자연스러운 안내 문구만 보여줍니다.
export const REPORT_UI_DESCRIPTIONS = {
  overview: '이번 달 소비가 어디에 집중됐는지 보기 쉽게 정리했어요.',
  savings: '절약 효과가 큰 항목부터 실천 방법과 함께 살펴볼 수 있어요.',
  forecast: '현재 소비 흐름을 바탕으로 다음 달 지출 변화를 예상해봤어요.',
};

export async function getReportData() {
  const response = await axios.get('/api/report');
  return normalizeReportResponse(response.data);
}

function normalizeReportResponse(payload) {
  const report =
    payload && typeof payload === 'object' && payload.data && typeof payload.data === 'object'
      ? payload.data
      : payload;

  return {
    reportMonthLabel: toStringOrFallback(report?.reportMonthLabel, ''),
    expenseCategories: normalizeExpenseCategories(report?.expenseCategories),
    totalExpense: toPositiveNumber(report?.totalExpense),
    overviewSummary: normalizeStringArray(report?.overviewSummary, 5),
    savingsRecommendations: normalizeSavingsRecommendations(
      report?.savingsRecommendations,
    ),
    nextMonthForecast: normalizeForecast(report?.nextMonthForecast),
  };
}

function normalizeExpenseCategories(categories) {
  if (!Array.isArray(categories)) {
    return [];
  }

  return categories
    .map((category) => ({
      categoryId: toStringOrFallback(category?.categoryId, ''),
      label: toStringOrFallback(category?.label, ''),
      color: toStringOrFallback(category?.color, '#999999'),
      share: toPositiveNumber(category?.share),
      startAngle: toNumber(category?.startAngle),
      endAngle: toNumber(category?.endAngle),
    }))
    .filter((category) => category.categoryId && category.label);
}

function normalizeSavingsRecommendations(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => ({
      categoryId: toStringOrFallback(item?.categoryId, ''),
      label: toStringOrFallback(item?.label, ''),
      color: toStringOrFallback(item?.color, '#999999'),
      expectedSavings: toPositiveNumber(item?.expectedSavings),
      barWidth: toPositiveNumber(item?.barWidth),
      tip: toStringOrFallback(item?.tip, ''),
    }))
    .filter((item) => item.categoryId && item.label);
}

function normalizeForecast(forecast) {
  return {
    totalSpend: toPositiveNumber(forecast?.totalSpend),
    deltaText: toStringOrFallback(forecast?.deltaText, '변동 없음'),
    summary: normalizeStringArray(forecast?.summary, 3),
  };
}

function normalizeStringArray(value, maxLength) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => toStringOrFallback(item, ''))
    .filter(Boolean)
    .slice(0, maxLength);
}

function toPositiveNumber(value) {
  const normalized = Number(value);
  return Number.isFinite(normalized) && normalized >= 0 ? normalized : 0;
}

function toNumber(value) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
}

function toStringOrFallback(value, fallback) {
  return typeof value === 'string' ? value.trim() : fallback;
}
