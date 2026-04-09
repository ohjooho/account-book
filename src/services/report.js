import sourceData from '../../data2.json';

// 실제 AI 연동 시에는 이 프롬프트를 그대로 API 요청 본문에 사용할 수 있습니다.
export const REPORT_PROMPTS = {
  overview:
    '이번 달 지출 데이터를 분석해서 소비 비중이 큰 카테고리 순으로 정리해줘. 응답에는 카테고리명, 금액, 비율이 반드시 포함되어야 하며, 사용자가 한눈에 이해할 수 있도록 소비 특징을 짧고 명확한 문장으로 설명해줘.',
  savings:
    '이번 달 지출 내역을 보고 절약 가능성이 높은 카테고리를 찾아줘. 각 카테고리마다 현실적인 절약 방법과 예상 절약 금액을 제안하고, 그래프에 바로 사용할 수 있도록 항목별 수치를 함께 정리해줘.',
  forecast:
    '이번 달 소비 패턴과 절약 제안을 반영했을 때 다음 달 지출이 어떻게 달라질지 예측해줘. 예상 총지출과 주요 변화 요인을 설명하고, 사용자가 바로 이해할 수 있도록 간단하고 자연스러운 문장으로 정리해줘.',
};

export const REPORT_UI_DESCRIPTIONS = {
  overview: '이번 달 소비가 어디에 집중됐는지 보기 쉽게 정리했어요.',
  savings: '절약 효과가 큰 항목부터 실천 방법과 함께 살펴볼 수 있어요.',
  forecast: '현재 소비 흐름을 바탕으로 다음 달 지출 변화를 예상해봤어요.',
};

const SAVINGS_RATE_MAP = {
  living: 0.1,
  subscription: 0.3,
  shopping: 0.15,
  food: 0.2,
  transport: 0.12,
  medical: 0.08,
  etc: 0.1,
};

const SAVINGS_TIP_MAP = {
  living: '고정 지출을 다시 점검하면 가장 큰 절약 폭을 만들 수 있어요.',
  subscription: '사용 빈도가 낮은 서비스부터 정리하면 부담 없이 줄일 수 있어요.',
  shopping: '충동구매를 줄이고 구매 주기를 늘리면 효과가 빠르게 보여요.',
  food: '외식과 배달 빈도를 줄이고 직접 준비하는 식사를 늘리면 절약 폭이 커져요.',
  transport: '짧은 거리는 도보나 대중교통으로 대체하면 비용을 안정적으로 줄일 수 있어요.',
  medical: '정기 구매 품목은 비교 구매로 소폭 절감이 가능해요.',
  etc: '기타 지출은 소액 결제를 묶어서 확인하면 새는 돈을 줄일 수 있어요.',
};

const CATEGORY_LABEL_MAP = {
  income: '수입',
  living: '생활',
  subscription: '구독',
  shopping: '쇼핑',
  food: '식비',
  transport: '교통',
  medical: '의료',
  etc: '기타',
};

const MOCK_DELAY_MS = 2000;

export async function getReportData({ simulateDelay = true } = {}) {
  if (simulateDelay) {
    // 테스트용 2초 지연
    // 실제 AI 연동 후에는 이 지연을 제거
    await delay(MOCK_DELAY_MS);
  }

  const latestCashflow = getTargetMonthlyCashflow();

  const categoryMap = Object.fromEntries(
    sourceData.categories.map((category) => [category.id, category]),
  );

  const expenseCategories = latestCashflow.spendingAnalysis
    .filter((item) => item.categoryId !== 'income' && item.totalAmount > 0)
    .map((item) => {
      const category = categoryMap[item.categoryId];
      const share = Number(
        ((item.totalAmount / latestCashflow.totalSpend) * 100).toFixed(1),
      );

      return {
        ...item,
        color: category?.color ?? '#999999',
        label: getCategoryLabel(category, item.categoryId),
        share,
      };
    })
    .sort((left, right) => right.totalAmount - left.totalAmount)
    .map((item, index, categories) => {
      const startAngle = categories
        .slice(0, index)
        .reduce((sum, category) => sum + (category.share / 100) * 360, 0);
      const endAngle = startAngle + (item.share / 100) * 360;

      return {
        ...item,
        startAngle,
        endAngle,
      };
    });

  const totalExpense = latestCashflow.totalSpend;
  const dominantCategory = expenseCategories[0] ?? {
    label: '주요 카테고리',
    share: 0,
  };
  const secondCategory = expenseCategories[1] ?? dominantCategory;
  const subscriptionCategory = expenseCategories.find(
    (item) => item.categoryId === 'subscription',
  ) ?? {
    label: '구독',
  };

  const overviewSummary = [
    `${dominantCategory.label} 지출이 전체의 ${dominantCategory.share}%로 가장 커서 이번 달 소비 흐름을 주도하고 있어요.`,
    `${secondCategory.label} 지출이 ${secondCategory.share}%를 차지해 주요 지출 축이 두 카테고리에 집중되어 있어요.`,
    `${subscriptionCategory.label}처럼 반복 결제가 발생하는 항목은 금액이 크지 않아도 누적되기 쉬워서 따로 관리하는 게 좋아요.`,
  ];

  const maxSavingsAmount = Math.max(
    ...expenseCategories.map(
      (item) => item.totalAmount * (SAVINGS_RATE_MAP[item.categoryId] ?? 0.1),
    ),
    1,
  );

  const savingsRecommendations = expenseCategories
    .map((item) => {
      const rate = SAVINGS_RATE_MAP[item.categoryId] ?? 0.1;
      const expectedSavings = Math.round(item.totalAmount * rate);

      return {
        categoryId: item.categoryId,
        label: item.label,
        color: item.color,
        expectedSavings,
        barWidth: Number(
          ((expectedSavings / maxSavingsAmount) * 100).toFixed(1),
        ),
        tip: `${item.label}에서 ${Math.round(rate * 100)}%만 조정해도 ${formatCurrency(expectedSavings)} 정도 절약할 수 있어요. ${SAVINGS_TIP_MAP[item.categoryId]}`,
      };
    })
    .sort((left, right) => right.expectedSavings - left.expectedSavings)
    .slice(0, 4);

  const realisticSavings = Math.round(
    savingsRecommendations.reduce((sum, item) => sum + item.expectedSavings, 0) *
      0.65,
  );

  const nextMonthSpend = Math.max(totalExpense - realisticSavings, 0);
  const delta = nextMonthSpend - totalExpense;

  return {
    prompts: REPORT_PROMPTS,
    uiDescriptions: REPORT_UI_DESCRIPTIONS,
    reportMonthLabel: formatMonth(latestCashflow.yearMonth),
    expenseCategories,
    totalExpense,
    overviewSummary,
    savingsRecommendations,
    nextMonthForecast: {
      totalSpend: nextMonthSpend,
      deltaText:
        delta === 0
          ? '변동 없음'
          : `${formatCurrency(Math.abs(delta))} ${delta < 0 ? '감소' : '증가'}`,
      summary: [
        `이번 달 절약 가이드 중 실천 가능성이 높은 항목만 반영하면 다음 달 지출은 ${formatCurrency(nextMonthSpend)} 정도로 예상할 수 있어요.`,
        `${dominantCategory.label}과 ${secondCategory.label}를 우선 관리하면 전체 절감 효과의 대부분을 만들 수 있어요.`,
        '반복 결제와 생활비 같은 고정성 지출을 먼저 줄이면 다음 달 예산을 더 안정적으로 유지할 수 있어요.',
      ],
    },
  };
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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

function getTargetMonthlyCashflow() {
  const targetYearMonth =
    sourceData.meta?.latestMonthInProgress ??
    sourceData.meta?.latestClosedMonth ??
    null;

  if (targetYearMonth) {
    const matchedCashflow = sourceData.monthlyCashflow.find(
      (item) => item.yearMonth === targetYearMonth,
    );

    if (matchedCashflow) {
      return matchedCashflow;
    }
  }

  return sourceData.monthlyCashflow[sourceData.monthlyCashflow.length - 1];
}

function getCategoryLabel(category, categoryId) {
  return category?.labelKo ?? CATEGORY_LABEL_MAP[categoryId] ?? category?.name ?? categoryId;
}
