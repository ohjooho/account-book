import sourceData from '../../data.json';

// 화면에는 프롬프트 대신 더 자연스러운 안내 문구만 보여줍니다.
export const REPORT_UI_DESCRIPTIONS = {
  overview: '이번 달 소비가 어디에 집중됐는지 보기 쉽게 정리했어요.',
  savings: '절약 효과가 큰 항목부터 실천 방법과 함께 살펴볼 수 있어요.',
  forecast: '현재 소비 흐름을 바탕으로 다음 달 지출 변화를 예상해봤어요.',
};

const OPENAI_MODEL = 'gpt-4.1-mini';
const OPENAI_API_URL = 'https://api.openai.com/v1/responses';
const FORECAST_AI_WEIGHT = 0.25;
const FORECAST_CLAMP_RATE = 0.06;
const FORECAST_MIN_VARIANCE = 30000;

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
  subscription:
    '사용 빈도가 낮은 서비스부터 정리하면 부담 없이 줄일 수 있어요.',
  shopping: '충동구매를 줄이고 구매 주기를 늘리면 효과가 빠르게 보여요.',
  food: '외식과 배달 빈도를 줄이고 직접 준비하는 식사를 늘리면 절약 폭이 커져요.',
  transport:
    '짧은 거리는 도보나 대중교통으로 대체하면 비용을 안정적으로 줄일 수 있어요.',
  medical: '정기 구매 품목은 비교 구매로 소폭 절감이 가능해요.',
  etc: '기타 지출은 소액 결제를 묶어서 확인하면 새는 돈을 줄일 수 있어요.',
};

const CATEGORY_LABEL_MAP = {
  income: '수입',
  living: '주거/통신',
  subscription: '구독',
  shopping: '쇼핑',
  food: '식비',
  transport: '교통',
  medical: '의료',
  etc: '기타',
};

export async function getReportData() {
  const runtimeData = await loadReportSourceData();
  const fallbackReport = buildLocalFallbackReport(runtimeData);
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return normalizeReportResponse({
      data: fallbackReport,
    });
  }

  try {
    const categoryMap = Object.fromEntries(
      runtimeData.categories.map((category) => [category.id, category]),
    );
    const reportContext = buildReportContext(
      runtimeData,
      getTargetYearMonth(runtimeData),
      categoryMap,
    );
    const aiReport = await requestAiReport(
      reportContext,
      fallbackReport.nextMonthForecast.totalSpend,
      apiKey,
    );

    return normalizeReportResponse({
      data: mergeAiReportWithFallback(aiReport, fallbackReport, categoryMap),
    });
  } catch (error) {
    console.error(
      'Failed to generate report from OpenAI. Falling back to local report data.',
      error,
    );

    return normalizeReportResponse({
      data: fallbackReport,
    });
  }
}

async function loadReportSourceData() {
  const currentDate = getKoreaDateString();

  try {
    const [transactions, categories] = await Promise.all([
      fetchJson('/api/transactions'),
      fetchJson('/api/categories'),
    ]);

    const resolvedTransactions =
      Array.isArray(transactions) && transactions.length > 0
        ? transactions
        : sourceData.transactions;
    const resolvedCategories =
      Array.isArray(categories) && categories.length > 0
        ? categories
        : sourceData.categories;

    const latestYearMonth =
      getLatestYearMonthFromTransactions(resolvedTransactions) ??
      sourceData.meta?.latestMonthInProgress ??
      sourceData.meta?.latestClosedMonth;

    return {
      ...sourceData,
      meta: {
        ...sourceData.meta,
        currentDate,
        latestMonthInProgress:
          latestYearMonth ?? sourceData.meta?.latestMonthInProgress,
        availableYearMonths: collectAvailableYearMonths(resolvedTransactions),
      },
      categories: resolvedCategories,
      transactions: resolvedTransactions,
    };
  } catch (error) {
    console.warn(
      'Failed to load live report source data. Falling back to bundled data.',
      error,
    );

    return {
      ...sourceData,
      meta: {
        ...sourceData.meta,
        currentDate,
      },
    };
  }
}

function normalizeReportResponse(payload) {
  const report =
    payload &&
    typeof payload === 'object' &&
    payload.data &&
    typeof payload.data === 'object'
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

function buildLocalFallbackReport(data = sourceData) {
  const targetYearMonth = getTargetYearMonth(data);
  const monthlyItem = buildMonthlySnapshot(data, targetYearMonth);
  const categoryMap = Object.fromEntries(
    data.categories.map((category) => [category.id, category]),
  );

  const expenseCategories = monthlyItem.spendingAnalysis
    .filter((item) => item.categoryId !== 'income' && item.totalAmount > 0)
    .map((item) => ({
      categoryId: item.categoryId,
      label: getCategoryLabel(categoryMap[item.categoryId], item.categoryId),
      color: normalizeColor(categoryMap[item.categoryId]?.color ?? '#999999'),
      share: Number(
        (
          (item.totalAmount / Math.max(monthlyItem.totalSpend, 1)) *
          100
        ).toFixed(1),
      ),
      totalAmount: item.totalAmount,
    }))
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

  const dominantCategory = expenseCategories[0] ?? {
    label: '주요 카테고리',
    share: 0,
  };
  const secondCategory = expenseCategories[1] ?? dominantCategory;
  const thirdCategory = expenseCategories[2] ?? secondCategory;
  const subscriptionCategory = expenseCategories.find(
    (item) => item.categoryId === 'subscription',
  ) ?? {
    label: '구독',
  };

  const savingsRecommendations = expenseCategories
    .map((item) => {
      const rate = SAVINGS_RATE_MAP[item.categoryId] ?? 0.1;
      const expectedSavings = Math.round(item.totalAmount * rate);

      return {
        categoryId: item.categoryId,
        label: item.label,
        color: item.color,
        expectedSavings,
        tip: `${item.label}에서 ${Math.round(rate * 100)}%만 조정해도 ${formatCurrency(expectedSavings)} 정도 절약할 수 있어요. ${SAVINGS_TIP_MAP[item.categoryId] ?? '불필요한 지출을 줄이면 절약 효과를 만들 수 있어요.'}`,
      };
    })
    .sort((left, right) => right.expectedSavings - left.expectedSavings)
    .slice(0, 4);

  const maxSavingsAmount = Math.max(
    ...savingsRecommendations.map((item) => item.expectedSavings),
    1,
  );
  const realisticSavings = Math.round(
    savingsRecommendations.reduce(
      (sum, item) => sum + item.expectedSavings,
      0,
    ) * 0.65,
  );
  const nextMonthSpend = Math.max(monthlyItem.totalSpend - realisticSavings, 0);
  const delta = nextMonthSpend - monthlyItem.totalSpend;

  return {
    reportMonthLabel: formatMonth(monthlyItem.yearMonth),
    expenseCategories,
    totalExpense: monthlyItem.totalSpend,
    overviewSummary: [
      `${dominantCategory.label} 지출이 전체의 ${dominantCategory.share}%로 가장 커서 이번 달 소비 흐름을 주도하고 있어요.`,
      `${secondCategory.label} 지출이 ${secondCategory.share}%를 차지해 주요 지출 축이 두 카테고리에 집중되어 있어요.`,
      `${thirdCategory.label}까지 포함한 상위 지출 항목을 먼저 관리하면 전체 예산 흐름을 훨씬 빠르게 정리할 수 있어요.`,
      `${subscriptionCategory.label}처럼 반복 결제가 발생하는 항목은 금액이 크지 않아도 누적되기 쉬워서 따로 관리하는 게 좋아요.`,
      monthlyItem.isPartialMonth
        ? `${formatMonth(monthlyItem.yearMonth)}은 ${monthlyItem.coveredTo}까지의 부분 집계라 월초 고정 지출 영향이 평소보다 더 크게 보일 수 있어요.`
        : `${formatMonth(monthlyItem.yearMonth)}은 여러 카테고리에 지출이 분산되어 있어 소비 패턴을 비교적 안정적으로 파악하기 좋아요.`,
    ],
    savingsRecommendations: savingsRecommendations.map((item) => ({
      ...item,
      barWidth: Number(
        ((item.expectedSavings / maxSavingsAmount) * 100).toFixed(1),
      ),
    })),
    nextMonthForecast: {
      totalSpend: nextMonthSpend,
      deltaText:
        delta === 0
          ? '변동 없음'
          : `${formatCurrency(Math.abs(delta))} ${delta < 0 ? '감소' : '증가'}`,
      summary: [
        `이번 달 절약 가이드 중 실천 가능성이 높은 항목만 반영하면 다음 달 지출은 ${formatCurrency(nextMonthSpend)} 정도로 예상할 수 있어요.`,
        `${dominantCategory.label}과 ${secondCategory.label}를 우선 관리하면 전체 절감 효과의 대부분을 만들 수 있어요.`,
        '반복 결제와 고정성 지출을 먼저 줄이면 다음 달 예산을 더 안정적으로 유지할 수 있어요.',
      ],
    },
  };
}

function buildReportContext(data, yearMonth, categoryMap) {
  const monthlyCashflow = buildMonthlySnapshot(data, yearMonth);
  const dailyCashflow = buildDailySnapshots(data, yearMonth);
  const transactions = data.transactions
    .filter((item) => item.date.startsWith(yearMonth))
    .map((item) => ({
      date: item.date,
      categoryId: item.categoryId,
      categoryLabel: getCategoryLabel(
        categoryMap[item.categoryId],
        item.categoryId,
      ),
      type: item.type,
      price: item.price,
      memo: item.memo,
      place: item.place,
    }));

  return {
    meta: {
      currentDate: data.meta?.currentDate ?? null,
      latestClosedMonth: data.meta?.latestClosedMonth ?? null,
      latestMonthInProgress: data.meta?.latestMonthInProgress ?? null,
    },
    reportMonth: yearMonth,
    categories: data.categories.map((category) => ({
      id: category.id,
      label: getCategoryLabel(category, category.id),
      type: category.type,
      color: normalizeColor(category.color),
    })),
    monthlyCashflow,
    dailyCashflow,
    transactions,
  };
}

async function requestAiReport(reportContext, forecastBaseline, apiKey) {
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: buildAiPrompt(reportContext, forecastBaseline),
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'OpenAI 요청 실패');
  }

  const payload = await response.json();
  const outputText = extractOutputText(payload);

  if (!outputText) {
    throw new Error('OpenAI 응답에서 텍스트를 찾지 못했습니다.');
  }

  return JSON.parse(extractJson(outputText));
}

function mergeAiReportWithFallback(aiReport, fallbackReport, categoryMap) {
  const overviewSummary = normalizeStringArray(aiReport?.overview?.summary, 5);
  const mergedSavingsItems = normalizeSavingsItems(
    aiReport?.savings?.items,
    fallbackReport.savingsRecommendations,
    categoryMap,
  );
  const forecastTotalSpend = normalizeForecastTotalSpend(
    aiReport?.forecast?.totalSpend,
    fallbackReport.nextMonthForecast.totalSpend,
  );
  const forecastSummary = normalizeStringArray(aiReport?.forecast?.summary, 3);
  const delta = forecastTotalSpend - fallbackReport.totalExpense;

  return {
    ...fallbackReport,
    overviewSummary:
      overviewSummary.length > 0
        ? padWithFallback(overviewSummary, fallbackReport.overviewSummary, 5)
        : fallbackReport.overviewSummary,
    savingsRecommendations: mergedSavingsItems,
    nextMonthForecast: {
      totalSpend: forecastTotalSpend,
      deltaText:
        delta === 0
          ? '변동 없음'
          : `${formatCurrency(Math.abs(delta))} ${delta < 0 ? '감소' : '증가'}`,
      summary:
        forecastSummary.length > 0
          ? padWithFallback(
              forecastSummary,
              fallbackReport.nextMonthForecast.summary,
              3,
            )
          : fallbackReport.nextMonthForecast.summary,
    },
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

function normalizeSavingsItems(items, fallbackItems, categoryMap) {
  const normalizedItems = Array.isArray(items)
    ? items
        .map((item) => {
          const categoryId = item?.categoryId;
          const category = categoryMap[categoryId];
          const expectedSavings = normalizePositiveInteger(
            item?.expectedSavings,
            0,
          );
          const tip = typeof item?.tip === 'string' ? item.tip.trim() : '';

          if (!category || expectedSavings <= 0 || !tip) {
            return null;
          }

          return {
            categoryId,
            label: getCategoryLabel(category, categoryId),
            color: category.color,
            expectedSavings,
            tip,
          };
        })
        .filter(Boolean)
        .slice(0, 4)
    : [];

  const targetItems =
    normalizedItems.length > 0 ? normalizedItems : fallbackItems;
  const maxSavingsAmount = Math.max(
    ...targetItems.map((item) => item.expectedSavings),
    1,
  );

  return targetItems.map((item) => ({
    ...item,
    barWidth: Number(
      ((item.expectedSavings / maxSavingsAmount) * 100).toFixed(1),
    ),
  }));
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

function padWithFallback(list, fallback, maxLength) {
  const padded = [...list];

  for (const sentence of fallback) {
    if (padded.length >= maxLength) {
      break;
    }

    if (!padded.includes(sentence)) {
      padded.push(sentence);
    }
  }

  return padded;
}

function normalizePositiveInteger(value, fallback) {
  const normalized = Number(value);
  return Number.isFinite(normalized) && normalized > 0
    ? Math.round(normalized)
    : fallback;
}

function normalizeForecastTotalSpend(value, fallback) {
  const normalized = Number(value);

  if (!Number.isFinite(normalized) || normalized <= 0) {
    return fallback;
  }

  const blendedValue = Math.round(
    fallback * (1 - FORECAST_AI_WEIGHT) + normalized * FORECAST_AI_WEIGHT,
  );
  const variance = Math.max(
    Math.round(fallback * FORECAST_CLAMP_RATE),
    FORECAST_MIN_VARIANCE,
  );
  const minValue = Math.max(fallback - variance, 0);
  const maxValue = fallback + variance;

  return Math.min(Math.max(blendedValue, minValue), maxValue);
}

function buildAiPrompt(reportContext, forecastBaseline) {
  const minForecast = Math.max(
    forecastBaseline -
      Math.max(
        Math.round(forecastBaseline * FORECAST_CLAMP_RATE),
        FORECAST_MIN_VARIANCE,
      ),
    0,
  );
  const maxForecast =
    forecastBaseline +
    Math.max(
      Math.round(forecastBaseline * FORECAST_CLAMP_RATE),
      FORECAST_MIN_VARIANCE,
    );

  return `
당신은 한국어로 답변하는 가계부 소비 분석가입니다.
주어진 데이터를 바탕으로 소비 리포트를 생성해주세요.

반드시 아래 조건을 지켜주세요.
1. 응답은 반드시 순수 JSON만 반환하세요.
2. 마크다운 코드블록(\`\`\`)을 절대 사용하지 마세요.
3. 모든 문장은 한국어로 작성하세요.
4. categoryId는 제공된 categories 목록의 id만 사용하세요.
5. savings.items는 3개에서 4개 사이로 작성하세요.
6. expectedSavings와 forecast.totalSpend는 숫자만 넣으세요.
7. overview.summary는 반드시 5문장으로 작성하세요.
8. ${reportContext.monthlyCashflow?.isPartialMonth ? '이번 달 데이터는 부분 집계이므로 요약에 그 점을 자연스럽게 반영하세요.' : '이번 달은 전체 월 데이터로 보고 분석하세요.'}
9. forecast.totalSpend는 기준 예측값 ${forecastBaseline}원을 중심으로 ${minForecast}원 이상 ${maxForecast}원 이하 범위에서만 작성하세요.

반환해야 하는 JSON 형식:
{
  "overview": {
    "summary": ["문장1", "문장2", "문장3", "문장4", "문장5"]
  },
  "savings": {
    "items": [
      {
        "categoryId": "food",
        "expectedSavings": 15000,
        "tip": "현실적인 절약 방법을 한 문장으로 설명"
      }
    ]
  },
  "forecast": {
    "totalSpend": 910000,
    "summary": ["문장1", "문장2", "문장3"]
  }
}

분석 데이터:
${JSON.stringify(reportContext, null, 2)}
`.trim();
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  if (!Array.isArray(payload?.output)) {
    return '';
  }

  return payload.output
    .flatMap((item) => (Array.isArray(item?.content) ? item.content : []))
    .map((content) => {
      if (typeof content?.text === 'string') {
        return content.text;
      }

      if (typeof content?.output_text === 'string') {
        return content.output_text;
      }

      return '';
    })
    .filter(Boolean)
    .join('\n');
}

function extractJson(value) {
  const trimmedValue = value.trim();

  if (trimmedValue.startsWith('{') && trimmedValue.endsWith('}')) {
    return trimmedValue;
  }

  const fencedMatch = trimmedValue.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const startIndex = trimmedValue.indexOf('{');
  const endIndex = trimmedValue.lastIndexOf('}');

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    return trimmedValue.slice(startIndex, endIndex + 1);
  }

  throw new Error('AI response did not include a valid JSON object.');
}

function getTargetYearMonth(data) {
  const currentYearMonth = getYearMonth(
    data.meta?.currentDate ?? getKoreaDateString(),
  );

  const hasCurrentMonthTransactions = Array.isArray(data.transactions)
    ? data.transactions.some((item) => item.date?.startsWith(currentYearMonth))
    : false;

  if (hasCurrentMonthTransactions) {
    return currentYearMonth;
  }

  return (
    getLatestYearMonthFromTransactions(data.transactions) ??
    data.meta?.latestMonthInProgress ??
    data.meta?.latestClosedMonth ??
    sourceData.meta?.latestMonthInProgress
  );
}

function getCategoryLabel(category, categoryId) {
  return (
    category?.labelKo ??
    CATEGORY_LABEL_MAP[categoryId] ??
    category?.name ??
    categoryId
  );
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
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
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

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }

  return response.json();
}

function buildMonthlySnapshot(data, yearMonth) {
  const monthlyTransactions = Array.isArray(data.transactions)
    ? data.transactions.filter((item) => item.date?.startsWith(yearMonth))
    : [];
  const totalSpend = monthlyTransactions
    .filter((item) => item.type === 'expense')
    .reduce((sum, item) => sum + toPositiveNumber(item.price), 0);
  const totalIncome = monthlyTransactions
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + toPositiveNumber(item.price), 0);
  const expenseCategories = data.categories.filter(
    (category) => category.type === 'expense',
  );

  const spendingAnalysis = expenseCategories
    .map((category) => {
      const categoryTransactions = monthlyTransactions.filter(
        (item) => item.type === 'expense' && item.categoryId === category.id,
      );

      return {
        categoryId: category.id,
        totalAmount: categoryTransactions.reduce(
          (sum, item) => sum + toPositiveNumber(item.price),
          0,
        ),
        transactionCount: categoryTransactions.length,
      };
    })
    .filter((item) => item.totalAmount > 0)
    .sort((left, right) => right.totalAmount - left.totalAmount);

  const currentYearMonth = getYearMonth(
    data.meta?.currentDate ?? getKoreaDateString(),
  );

  return {
    yearMonth,
    totalSpend,
    totalIncome,
    totalCashflow: totalIncome - totalSpend,
    spendingAnalysis,
    isPartialMonth: yearMonth === currentYearMonth,
    coveredTo: data.meta?.currentDate ?? getKoreaDateString(),
  };
}

function buildDailySnapshots(data, yearMonth) {
  const grouped = new Map();

  for (const item of data.transactions ?? []) {
    if (!item.date?.startsWith(yearMonth)) {
      continue;
    }

    const current = grouped.get(item.date) ?? {
      date: item.date,
      yearMonth,
      totalSpend: 0,
      totalIncome: 0,
      totalCashflow: 0,
    };

    if (item.type === 'expense') {
      current.totalSpend += toPositiveNumber(item.price);
      current.totalCashflow -= toPositiveNumber(item.price);
    } else if (item.type === 'income') {
      current.totalIncome += toPositiveNumber(item.price);
      current.totalCashflow += toPositiveNumber(item.price);
    }

    grouped.set(item.date, current);
  }

  return [...grouped.values()].sort((left, right) =>
    left.date.localeCompare(right.date),
  );
}

function getLatestYearMonthFromTransactions(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return '';
  }

  const latestTransaction = [...transactions]
    .filter((item) => typeof item.date === 'string' && item.date.length >= 7)
    .sort((left, right) => {
      const dateCompare = String(right.date).localeCompare(String(left.date));

      if (dateCompare !== 0) {
        return dateCompare;
      }

      return String(right.id).localeCompare(String(left.id));
    })[0];

  return latestTransaction?.date?.slice(0, 7) ?? '';
}

function collectAvailableYearMonths(transactions) {
  return [
    ...new Set(
      (transactions ?? [])
        .map((item) => item.date?.slice(0, 7))
        .filter(Boolean),
    ),
  ].sort();
}

function getYearMonth(dateString) {
  return String(dateString ?? '').slice(0, 7);
}

function getKoreaDateString() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';

  return `${year}-${month}-${day}`;
}

function normalizeColor(color) {
  const resolved = toStringOrFallback(color, '#999999');
  return resolved.startsWith('#') ? resolved : `#${resolved}`;
}
