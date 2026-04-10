import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import OpenAI from 'openai';
import { loadEnv } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE_PATH = resolve(__dirname, '../../data2.json');

const REPORT_PROMPTS = {
  overview:
    '이번 달 지출 데이터를 분석해서 소비 비중이 큰 카테고리 순으로 정리해줘. 응답에는 카테고리명, 금액, 비율이 반드시 포함되어야 하며, 사용자가 한눈에 이해할 수 있도록 소비 특징을 짧고 명확한 문장으로 설명해줘.',
  savings:
    '이번 달 지출 내역을 보고 절약 가능성이 높은 카테고리를 찾아줘. 각 카테고리마다 현실적인 절약 방법과 예상 절약 금액을 제안하고, 그래프에 바로 사용할 수 있도록 항목별 수치를 함께 정리해줘.',
  forecast:
    '이번 달 소비 패턴과 절약 제안을 반영했을 때 다음 달 지출이 어떻게 달라질지 예측해줘. 예상 총지출과 주요 변화 요인을 설명하고, 사용자가 바로 이해할 수 있도록 간단하고 자연스러운 문장으로 정리해줘.',
};

const REPORT_UI_DESCRIPTIONS = {
  overview: '이번 달 소비가 어디에 집중됐는지 보기 쉽게 정리했어요.',
  savings: '절약 효과가 큰 항목부터 실천 방법과 함께 살펴볼 수 있어요.',
  forecast: '현재 소비 흐름을 바탕으로 다음 달 지출 변화를 예상해봤어요.',
};

const OPENAI_MODEL = 'gpt-5.4-mini';
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
  subscription: '사용 빈도가 낮은 서비스부터 정리하면 부담 없이 줄일 수 있어요.',
  shopping: '충동구매를 줄이고 구매 주기를 늘리면 효과가 빠르게 보여요.',
  food: '외식과 배달 빈도를 줄이고 직접 준비하는 식사를 늘리면 절약 폭이 커져요.',
  transport: '짧은 거리는 도보나 대중교통으로 대체하면 비용을 안정적으로 줄일 수 있어요.',
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

let cachedSourceData = null;
let openAIClient = null;
let envLoaded = false;

export async function handleReportApi(req, res) {
  loadServerEnv();

  const sourceData = getSourceData();
  const requestUrl = new URL(req.url ?? '/', 'http://localhost');
  const requestedMonth = requestUrl.searchParams.get('month');
  const latestCashflow = getTargetMonthlyCashflow(sourceData, requestedMonth);

  if (!latestCashflow) {
    sendJson(res, 404, {
      message: 'Report data is not available.',
    });
    return;
  }

  const categoryMap = Object.fromEntries(
    sourceData.categories.map((category) => [category.id, category]),
  );
  const fallbackReport = buildFallbackReport(latestCashflow, categoryMap);
  const apiKey = getApiKey();

  if (!apiKey) {
    sendJson(res, 200, {
      data: fallbackReport,
      meta: {
        source: 'fallback',
        reason: 'missing_api_key',
      },
    });
    return;
  }

  try {
    const reportContext = buildReportContext(sourceData, latestCashflow.yearMonth, categoryMap);
    const aiReport = await requestAiReport(
      reportContext,
      fallbackReport.nextMonthForecast.totalSpend,
      apiKey,
    );

    sendJson(res, 200, {
      data: mergeAiReportWithFallback(aiReport, fallbackReport, categoryMap),
      meta: {
        source: 'ai',
      },
    });
  } catch (error) {
    console.error('Failed to generate AI report. Falling back to local report data.', error);

    sendJson(res, 200, {
      data: fallbackReport,
      meta: {
        source: 'fallback',
        reason: 'ai_generation_failed',
      },
    });
  }
}

export function createReportApiServer() {
  return createServer(async (req, res) => {
    const requestUrl = new URL(req.url ?? '/', 'http://localhost');

    if (
      req.method === 'GET' &&
      (requestUrl.pathname === '/report' || requestUrl.pathname === '/api/report')
    ) {
      try {
        await handleReportApi(req, res);
      } catch (error) {
        console.error('Failed to handle report API request.', error);
        sendJson(res, 500, {
          message: 'Failed to build AI report.',
        });
      }
      return;
    }

    sendJson(res, 404, {
      message: 'Not Found',
    });
  });
}

function startReportApiServer() {
  loadServerEnv();

  const port = Number(process.env.API_PORT || 3000);
  const server = createReportApiServer();

  server.listen(port, () => {
    console.log(`Report API server listening on http://localhost:${port}`);
  });
}

function loadServerEnv() {
  if (envLoaded) {
    return;
  }

  const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');

  if (!process.env.OPENAI_API_KEY && env.OPENAI_API_KEY) {
    process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;
  }

  if (!process.env.VITE_OPENAI_API_KEY && env.VITE_OPENAI_API_KEY) {
    process.env.VITE_OPENAI_API_KEY = env.VITE_OPENAI_API_KEY;
  }

  envLoaded = true;
}

function getSourceData() {
  if (cachedSourceData) {
    return cachedSourceData;
  }

  cachedSourceData = JSON.parse(readFileSync(DATA_FILE_PATH, 'utf-8'));
  return cachedSourceData;
}

function buildFallbackReport(latestCashflow, categoryMap) {
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

  const overviewSummary = [
    `${dominantCategory.label} 지출이 전체의 ${dominantCategory.share}%로 가장 커서 이번 달 소비 흐름을 주도하고 있어요.`,
    `${secondCategory.label} 지출이 ${secondCategory.share}%를 차지해 주요 지출 축이 두 카테고리에 집중되어 있어요.`,
    `${thirdCategory.label}까지 포함한 상위 지출 항목을 먼저 관리하면 전체 예산 흐름을 훨씬 빠르게 정리할 수 있어요.`,
    `${subscriptionCategory.label}처럼 반복 결제가 발생하는 항목은 금액이 크지 않아도 누적되기 쉬워서 따로 관리하는 게 좋아요.`,
    latestCashflow.isPartialMonth
      ? `${formatMonth(latestCashflow.yearMonth)}은 ${latestCashflow.coveredTo}까지의 부분 집계라 월초 고정 지출 영향이 평소보다 더 크게 보일 수 있어요.`
      : `${formatMonth(latestCashflow.yearMonth)}은 여러 카테고리에 지출이 분산되어 있어 소비 패턴을 비교적 안정적으로 파악하기 좋아요.`,
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

  const nextMonthSpend = Math.max(latestCashflow.totalSpend - realisticSavings, 0);
  const delta = nextMonthSpend - latestCashflow.totalSpend;

  return {
    prompts: REPORT_PROMPTS,
    uiDescriptions: REPORT_UI_DESCRIPTIONS,
    reportMonthLabel: formatMonth(latestCashflow.yearMonth),
    expenseCategories,
    totalExpense: latestCashflow.totalSpend,
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
        '반복 결제와 주거/통신 같은 고정성 지출을 먼저 줄이면 다음 달 예산을 더 안정적으로 유지할 수 있어요.',
      ],
    },
  };
}

function buildReportContext(sourceData, yearMonth, categoryMap) {
  const monthlyCashflow = sourceData.monthlyCashflow.find(
    (item) => item.yearMonth === yearMonth,
  );
  const dailyCashflow = sourceData.dailyCashflow.filter(
    (item) => item.yearMonth === yearMonth,
  );
  const transactions = sourceData.transactions
    .filter((item) => item.date.startsWith(yearMonth))
    .map((item) => ({
      date: item.date,
      categoryId: item.categoryId,
      categoryLabel: getCategoryLabel(categoryMap[item.categoryId], item.categoryId),
      type: item.type,
      price: item.price,
      memo: item.memo,
      place: item.place,
    }));

  return {
    meta: {
      currentDate: sourceData.meta?.currentDate ?? null,
      latestClosedMonth: sourceData.meta?.latestClosedMonth ?? null,
      latestMonthInProgress: sourceData.meta?.latestMonthInProgress ?? null,
    },
    reportMonth: yearMonth,
    categories: sourceData.categories.map((category) => ({
      id: category.id,
      label: getCategoryLabel(category, category.id),
      type: category.type,
      color: category.color,
    })),
    monthlyCashflow,
    dailyCashflow,
    transactions,
  };
}

async function requestAiReport(reportContext, forecastBaseline, apiKey) {
  const client = getOpenAIClient(apiKey);
  const response = await client.responses.create({
    model: OPENAI_MODEL,
    reasoning: { effort: 'low' },
    input: buildAiPrompt(reportContext, forecastBaseline),
  });

  const outputText = extractOutputText(response);

  if (!outputText) {
    throw new Error('OpenAI response did not include output text.');
  }

  return JSON.parse(extractJson(outputText));
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

function mergeAiReportWithFallback(aiReport, fallbackReport, categoryMap) {
  const overviewSummary = normalizeStringArray(
    aiReport?.overview?.summary,
    fallbackReport.overviewSummary,
    5,
  );

  const mergedSavingsItems = normalizeSavingsItems(
    aiReport?.savings?.items,
    fallbackReport.savingsRecommendations,
    categoryMap,
  );

  const forecastTotalSpend = normalizeForecastTotalSpend(
    aiReport?.forecast?.totalSpend,
    fallbackReport.nextMonthForecast.totalSpend,
  );
  const forecastSummary = normalizeStringArray(
    aiReport?.forecast?.summary,
    fallbackReport.nextMonthForecast.summary,
    3,
  );
  const delta = forecastTotalSpend - fallbackReport.totalExpense;

  return {
    ...fallbackReport,
    overviewSummary,
    savingsRecommendations: mergedSavingsItems,
    nextMonthForecast: {
      totalSpend: forecastTotalSpend,
      deltaText:
        delta === 0
          ? '변동 없음'
          : `${formatCurrency(Math.abs(delta))} ${delta < 0 ? '감소' : '증가'}`,
      summary: forecastSummary,
    },
  };
}

function normalizeSavingsItems(items, fallbackItems, categoryMap) {
  const normalizedItems = Array.isArray(items)
    ? items
        .map((item) => {
          const categoryId = item?.categoryId;
          const category = categoryMap[categoryId];
          const expectedSavings = normalizePositiveInteger(item?.expectedSavings, 0);
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

  const targetItems = normalizedItems.length > 0 ? normalizedItems : fallbackItems;
  const maxSavingsAmount = Math.max(
    ...targetItems.map((item) => item.expectedSavings),
    1,
  );

  return targetItems.map((item) => ({
    ...item,
    barWidth: Number(((item.expectedSavings / maxSavingsAmount) * 100).toFixed(1)),
  }));
}

function normalizeStringArray(value, fallback, maxLength) {
  const normalized = Array.isArray(value)
    ? value
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
        .slice(0, maxLength)
    : [];

  if (normalized.length === 0) {
    return fallback;
  }

  if (normalized.length >= maxLength) {
    return normalized;
  }

  const padded = [...normalized];

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
    forecastBaseline - Math.max(
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

function getTargetMonthlyCashflow(sourceData, requestedMonth) {
  const targetYearMonth =
    requestedMonth ||
    sourceData.meta?.latestMonthInProgress ||
    sourceData.meta?.latestClosedMonth ||
    null;

  if (!targetYearMonth) {
    return sourceData.monthlyCashflow[sourceData.monthlyCashflow.length - 1] ?? null;
  }

  return (
    sourceData.monthlyCashflow.find((item) => item.yearMonth === targetYearMonth) ??
    sourceData.monthlyCashflow[sourceData.monthlyCashflow.length - 1] ??
    null
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

function getApiKey() {
  return process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || '';
}

function getOpenAIClient(apiKey) {
  if (openAIClient) {
    return openAIClient;
  }

  openAIClient = new OpenAI({
    apiKey,
  });

  return openAIClient;
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

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
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

if (process.argv[1] && process.argv[1].endsWith('reportApi.js')) {
  startReportApiServer();
}
