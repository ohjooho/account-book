<template>
  <div class="transaction-list-page">
    <!-- ===== 1. 달력 영역 ===== -->
    <section class="calendar-section">
      <div class="calendar-card">
        <div class="calendar-header">
          <v-btn variant="text" density="comfortable" @click="moveMonth(-1)">
            &lt;
          </v-btn>
          <h2 class="calendar-title">{{ currentMonthLabel }}</h2>
          <v-btn variant="text" density="comfortable" @click="moveMonth(1)">
            &gt;
          </v-btn>
        </div>
        <div class="calendar-sub-actions">
          <v-btn
            size="small"
            variant="text"
            :class="{ active: filter.period === 'all' }"
            @click="setPeriod('all')"
          >
            전체 보기
          </v-btn>
        </div>
        <v-calendar
          v-model="selectedDate"
          view-mode="month"
          class="custom-calendar"
        >
          <template #day="slotProps">
            <div
              v-if="getCalendarCell(slotProps)"
              class="custom-day-overlay"
              @click.stop="handleDateSelect(getCalendarCell(slotProps).date)"
            >
              <div class="custom-day-summary">
                <span
                  v-if="
                    getSummaryByDate(getCalendarCell(slotProps).date)
                      .incomeCount > 0
                  "
                  class="summary-badge income"
                >
                  <span class="dot"></span
                  >{{
                    getSummaryByDate(getCalendarCell(slotProps).date)
                      .incomeCount
                  }}
                </span>

                <span
                  v-if="
                    getSummaryByDate(getCalendarCell(slotProps).date)
                      .expenseCount > 0
                  "
                  class="summary-badge expense"
                >
                  <span class="dot"></span
                  >{{
                    getSummaryByDate(getCalendarCell(slotProps).date)
                      .expenseCount
                  }}
                </span>
              </div>
            </div>
          </template>
        </v-calendar>
      </div>
    </section>

    <!-- ===== 2. 필터 영역 ===== -->
    <section class="filter-section">
      <div class="filter-container">
        <div class="filter-group">
          <button
            :class="{ active: filter.period === 'all' }"
            @click="setPeriod('all')"
          >
            전체 기간
          </button>
          <button
            :class="{ active: filter.period === 'today' }"
            @click="setPeriod('today')"
          >
            오늘
          </button>
          <button
            :class="{ active: filter.period === 'month' }"
            @click="setPeriod('month')"
          >
            이번 달
          </button>
        </div>

        <div class="filter-group">
          <DatePicker v-model="filter.startDate" />
          <span>~</span>
          <DatePicker v-model="filter.endDate" :min-date="filter.startDate" />
        </div>

        <div class="filter-group">
          <select v-model="filter.categoryId" class="filter-select">
            <option value="">카테고리 전체</option>
            <option
              v-for="category in categoryStore.categories"
              :key="category.id"
              :value="category.id"
            >
              {{ category.labelKo }}
            </option>
          </select>
        </div>
        <div class="filter-group search-group">
          <input
            type="text"
            :value="filter.searchQuery"
            @input="handleSearchInput"
            placeholder="메모 검색"
            class="search-input"
          />
        </div>
      </div>
    </section>

    <!-- ===== 3. 거래 목록 테이블 ===== -->
    <section class="list-section">
      <h2 class="section-title">거래 내역</h2>

      <!-- 데이터 없을 때 -->
      <div v-if="filteredTransactions.length === 0" class="empty-state">
        조건에 맞는 거래 내역이 없습니다.
      </div>

      <!-- 거래 목록 테이블 -->
      <table v-else class="transaction-table">
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
            v-for="transaction in filteredTransactions"
            :key="transaction.id"
            class="transaction-row"
            @click="goToDetail(transaction.id)"
          >
            <td>{{ formatDate(transaction.date) }}</td>
            <td>
              <span
                class="category-badge"
                :style="{
                  backgroundColor: getCategoryColor(transaction.categoryId),
                }"
              >
                {{ getCategoryName(transaction.categoryId) }}
              </span>
            </td>
            <td class="memo-cell">{{ transaction.memo }}</td>
            <td
              class="align-right price-cell"
              :class="transaction.type === 'income' ? 'income' : 'expense'"
            >
              ₩ {{ formatPrice(transaction.price) }}
            </td>
            <td>
              <span
                class="type-badge"
                :class="transaction.type === 'income' ? 'income' : 'expense'"
              >
                {{ transaction.type === 'income' ? '수입' : '지출' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup>
import {
  onMounted,
  onBeforeUnmount,
  computed,
  reactive,
  ref,
  watch,
} from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useTransactionsStore } from '@/stores/transactions';
import { useCategoryStore } from '@/stores/category';
import DatePicker from '@/components/DatePicker.vue';

// Store 연결
const transactionsStore = useTransactionsStore();
const categoryStore = useCategoryStore();

// 라우터 사용 (페이지 이동)
const router = useRouter();
const route = useRoute();

// 오늘 날짜 문자열 (YYYY-MM-DD)
const todayStr = new Date().toISOString().split('T')[0];

// 필터 상태 관리
const filter = reactive({
  period: 'all',
  startDate: '',
  endDate: '',
  categoryId: '',
  searchQuery: '',
});

const updateQuery = () => {
  const query = {
    category: filter.categoryId || undefined,
    search: filter.searchQuery || undefined,
  };

  // '이번 달' 버튼 클릭 시에는 yearMonth 사용
  if (filter.period === 'month' && filter.startDate) {
    query.yearMonth = filter.startDate.slice(0, 7);
    selectedDate.value = filter.startDate;
  } else {
    // 직접 날짜를 선택했거나 '오늘'인 경우 start/end 사용
    query.start = filter.startDate || undefined;
    query.end = filter.endDate || undefined;

    if (filter.startDate) {
      selectedDate.value = filter.startDate;
    }
  }

  router.replace({ path: '/transactions', query });
};

watch(
  () => filter.categoryId,
  () => {
    updateQuery();
  },
);

watch(
  [() => filter.startDate, () => filter.endDate],
  ([startDate, endDate], [prevStartDate]) => {
    if (startDate || endDate) {
      filter.period = 'custom';
    }

    // 시작일 없이 종료일만 고른 경우 → 시작일을 종료일로 맞춤
    if (!startDate && endDate) {
      filter.startDate = endDate;
      selectedDate.value = endDate;
    }

    // 원래 시작일이 있었는데, 사용자가 시작일을 지운 상태에서 종료일만 남은 경우도 보정
    if (!filter.startDate && filter.endDate) {
      filter.startDate = filter.endDate;
      selectedDate.value = filter.endDate;
      return;
    }

    // 종료일이 시작일보다 빠르면 종료일을 시작일로 보정
    if (startDate && endDate && endDate < startDate) {
      filter.startDate = endDate;
    }

    if (startDate && startDate !== prevStartDate) {
      selectedDate.value = startDate;
    }

    updateQuery();
  },
);

let timer = null;

const handleSearchInput = (e) => {
  if (timer) {
    clearTimeout(timer);
  }

  timer = setTimeout(() => {
    // e.target.value를 바로 filter에 넣고, filteredTransactions가 이를 감지해 자동으로 리스트 변환.
    filter.searchQuery = e.target.value.trim();

    // 만약 URL 업데이트 함수를 만드셨다면 여기서 호출하세요.
    updateQuery();
  }, 300);
};

// 컴포넌트가 사라질 때 타이머 제거 (메모리 누수 방지)
onBeforeUnmount(() => {
  if (timer) {
    clearTimeout(timer);
  }
});

onMounted(async () => {
  await transactionsStore.fetchTransactions();
  await categoryStore.fetchCategories();
});

// ===== 달력 상태 =====
const selectedDate = ref(new Date().toISOString().slice(0, 10));

// functions

// ========= 달력 관련 함수 ==========
// 달력 헤더 현재 연/월 표시
const currentMonthLabel = computed(() => {
  const date = new Date(selectedDate.value);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
});
// 달력 헤더 양옆 월 이동 버튼
const moveMonth = (diff) => {
  const date = new Date(selectedDate.value);
  date.setMonth(date.getMonth() + diff);
  selectedDate.value = date.toISOString().slice(0, 10);
};

// 날짜별 수입/지출 건수 요약
const calendarSummaryMap = computed(() => {
  const map = {};

  transactionsStore.transactions.forEach((tx) => {
    const date = tx.date;

    if (!map[date]) {
      map[date] = {
        incomeCount: 0,
        expenseCount: 0,
      };
    }

    if (tx.type === 'income') {
      map[date].incomeCount += 1;
    } else {
      map[date].expenseCount += 1;
    }
  });

  return map;
});
// 특정 날짜의 수입/지출 건수 가져오기
const getSummaryByDate = (dateStr) => {
  return (
    calendarSummaryMap.value[dateStr] || {
      incomeCount: 0,
      expenseCount: 0,
    }
  );
};

// Vuetify calendar slot 값 꺼내기
const getCalendarCell = (slotProps) => {
  if (slotProps?.week && Number.isInteger(slotProps.index)) {
    return slotProps.week[slotProps.index] || null;
  }

  if (slotProps?.day) {
    return slotProps.day;
  }

  if (slotProps?.date) {
    return slotProps;
  }

  return null;
};

// 캘린더에서 날짜 클릭할 때
const handleDateSelect = (dateStr) => {
  setPeriod('custom', dateStr);
};

// 필터링 관련 함수

// 1. URL 상태를 필터 변수에 강제로 입히는 함수 (초기화 로직 포함)
const applyQueryParams = () => {
  const query = route.query;

  // 카테고리와 검색어 (없으면 빈 값으로 초기화)
  filter.categoryId = query.category || '';
  filter.searchQuery = query.search || '';

  // 날짜 및 기간 모드 동기화
  if (query.yearMonth) {
    // yearMonth 처리
    const [year, month] = query.yearMonth.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();

    filter.startDate = `${query.yearMonth}-01`;
    filter.endDate = `${query.yearMonth}-${lastDay}`;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // getMonth()는 0부터 시작하므로 +1

    // 주소창의 연/월 숫자가 실제 현재 연/월과 정확히 일치하는지 확인
    if (year === currentYear && month === currentMonth) {
      filter.period = 'month';
    } else {
      filter.period = 'custom'; // 이번 달이 아니면 버튼 불 끄기
    }
  } else if (query.start || query.end) {
    // 직접 입력(custom) 방식 처리
    filter.startDate = query.start || '';
    filter.endDate = query.end || '';

    if (filter.startDate === todayStr && filter.endDate === todayStr) {
      filter.period = 'today';
    } else {
      filter.period = 'custom';
    }
  } else {
    // 💡 핵심: 주소창에 아무것도 없을 때 (메뉴 클릭 시) 전체 모드로 초기화
    filter.startDate = '';
    filter.endDate = '';
    filter.period = 'all';
  }
};

// 라우트 쿼리 변경 감시
watch(
  () => route.query,
  () => {
    applyQueryParams();
  },
  { immediate: true, deep: true },
);

// 기간 버튼 클릭 핸들러
const setPeriod = (p, dateStr = null) => {
  if (dateStr > todayStr) {
    // 오늘 이후 날짜 선택 시, 오늘 날짜로 초기화
    filter.startDate = todayStr;
    filter.endDate = todayStr;
    return;
  } else {
    filter.startDate = dateStr || todayStr;
    filter.endDate = dateStr || todayStr;
  }
  filter.period = p;

  if (p === 'today') {
    filter.period = 'today';
    filter.startDate = todayStr;
    filter.endDate = todayStr;
  } else if (p === 'month') {
    // 1. 현재 연도와 월 YYYY-MM 형식으로 추출
    const currentYearMonth = todayStr.slice(0, 7);

    // 2. 이번 달의 마지막 날 계산
    const year = todayStr.slice(0, 4);
    const month = parseInt(todayStr.slice(5, 7)) + 1;
    const lastDay = new Date(year, month, 0).getDate() - 1;

    filter.period = 'month';
    filter.startDate = `${currentYearMonth}-01`;
    filter.endDate = `${currentYearMonth}-${lastDay}`;
  } else if (p === 'all') {
    filter.period = 'all';
    filter.startDate = '';
    filter.endDate = '';
    filter.searchQuery = '';
    selectedDate.value = todayStr;

    router.replace({
      path: '/transactions',
      query: {},
    });
  } else if (p === 'custom') {
    // 커스텀 모드는 날짜 입력창에서 직접 날짜를 선택하도록 유도 (버튼 자체는 활성화 상태 유지)
    filter.period = 'custom';
    filter.startDate = dateStr || filter.startDate;
    filter.endDate = dateStr || filter.endDate;

    filter.searchQuery = dateStr ? filter.searchQuery : '';
    selectedDate.value = dateStr || selectedDate.value;

    router.replace({
      path: '/transactions',
      query: {
        start: filter.startDate || undefined,
        end: filter.endDate || undefined,
      },
    });
  }

  updateQuery();
};

// 핵심: 필터링된 거래 목록
const filteredTransactions = computed(() => {
  let list = [...transactionsStore.transactions];

  // 1. 카테고리 필터
  if (filter.categoryId) {
    list = list.filter((t) => t.categoryId === filter.categoryId);
  }

  // 2. 날짜 기간 필터
  if (filter.startDate) {
    list = list.filter((t) => t.date >= filter.startDate);
  }
  if (filter.endDate) {
    list = list.filter((t) => t.date <= filter.endDate);
  }

  // 3. 메모 검색 필터
  if (filter.searchQuery) {
    list = list.filter((t) =>
      t.memo.toLowerCase().includes(filter.searchQuery.toLowerCase()),
    );
  }

  // 4. 최신순 정렬
  return list.sort((a, b) => {
    // 날짜 내림차순 (최신이 위)
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    // 날짜가 같으면 id 내림차순 (큰 id = 나중에 추가된 것)
    return b.id - a.id;
  });
});

// 거래 목록 관련 함수

// 카테고리 이름 가져오기
const getCategoryName = (categoryId) => {
  const category = categoryStore.getCategoryById(categoryId);
  return category ? category.labelKo : '미분류';
};

// 카테고리 색상 가져오기
const getCategoryColor = (categoryId) => {
  const category = categoryStore.getCategoryById(categoryId);
  return category ? category.color : '#cccccc';
};

// 금액 포맷 (천 단위 콤마)
const formatPrice = (price) => {
  return price.toLocaleString('ko-KR');
};

// 날짜 포맷 (2026-04-08 → 4월 8일)
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // 현재 연도와 데이터의 연도가 같은지 비교
  if (year === now.getFullYear()) {
    return `${month}월 ${day}일`;
  } else {
    return `${year}년 ${month}월 ${day}일`;
  }
};

// 목록 아이템 클릭
const goToDetail = (id) => {
  router.push(`/transactions/${id}`);
};

// 날짜/기간 선택 해제 → 전체 목록 다시 보기
const resetSelectedDateFilter = () => {
  filter.period = 'all';
  filter.startDate = '';
  filter.endDate = '';
  filter.categoryId = '';
  filter.searchQuery = '';

  selectedDate.value = todayStr;

  router.replace({
    path: '/transactions',
    query: {},
  });
};
</script>

<style scoped>
/* ===== 페이지 전체 ===== */
.transaction-list-page {
  padding: 24px;
  max-width: 1200px;
  min-width: 800px;
  margin: 0 auto;
  /* position: relative; */
}

/* ===== 섹션 공통 ===== */
section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 16px;
}

/* ===== 달력 영역 ===== */
.calendar-section {
  margin-top: 0px;
  margin-bottom: 24px;
}

.calendar-card {
  background: #5d6d97;
  border-radius: 18px;
  padding: 10px;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 10px;
}

.calendar-title {
  font-size: 32px;
  font-weight: bold;
  color: #ffffff;
  margin: 0;
}

.calendar-sub-actions :deep(.v-btn) {
  background-color: white;
  color: black !important;
}

.custom-calendar {
  border-radius: 17px;
  overflow: hidden;
}

.calendar-sub-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 4px;
}

/* 기본 이벤트 바는 숨김 */
:deep(.v-event),
:deep(.v-calendar-month__day-events),
:deep(.v-calendar-weekly__day-allday) {
  display: none !important;
}

/* 달력 기본 배경/선 */
:deep(.v-calendar) {
  background: white;
  border-color: rgba(255, 255, 255, 0.12);
}

:deep(.v-calendar-month__day),
:deep(.v-calendar-weekly__day) {
  position: relative;
  min-height: 90px;
  border: 0.5px solid #d5d5d5 !important;
}

/* 헤더 양옆 월 이동 버튼 보이게 */
.calendar-header :deep(.v-btn) {
  min-width: 40px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.18) !important;
  color: #ffffff !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* 헤더 버튼 안 아이콘 자체 색/크기 */
.calendar-header :deep(.v-btn .v-icon) {
  color: #ffffff !important;
  font-size: 24px !important;
  opacity: 1 !important;
}

/* 요일 헤더 */
:deep(.v-calendar-month__weekday),
:deep(.v-calendar-weekly__head-weekday),
:deep(.v-calendar-month__weekdays > div),
:deep(.v-calendar-weekly__head > div) {
  background: #f5f5f5 !important;
  color: black !important;
  font-weight: 600;
  border-color: #d5d5d5 !important;
}

/* 특정 요일만 다른 색 먹는 것 방지 */
:deep(.v-calendar-month__weekday.v-calendar-weekly__head-weekday),
:deep(.v-calendar-month__weekday--selected),
:deep(.v-calendar-weekly__head-weekday--selected) {
  background: #f5f5f5 !important;
  color: black !important;
}

/* 날짜 숫자 */
:deep(.v-calendar-month__day-number),
:deep(.v-calendar-weekly__day-label) {
  color: black;
  opacity: 1 !important;
  font-weight: 700;
}

/* 저번달 / 다음달 칸 배경도 현재 달과 동일하게 */
:deep(.v-outside) {
  background: #f2f2f2 !important;
}
/* 저번달 / 다음달 날짜 숫자만 연하게 */
:deep(.v-outside .v-calendar-month__day-number),
:deep(.v-outside .v-calendar-weekly__day-label) {
  color: #d9d9d9 !important;
  opacity: 1 !important;
}

/* 저번달 / 다음달 배지도 진하게 유지 */
:deep(.v-outside .custom-day-overlay) {
  opacity: 0 !important;
}

/* 날짜 칸 안 하단 요약 */
.custom-day-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  cursor: pointer;
}

.custom-day-summary {
  position: absolute;
  left: 10px;
  bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.summary-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 7px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  background: #eaf1f7;
}

.summary-badge .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.summary-badge.income {
  color: #4f8f86;
}

.summary-badge.income .dot {
  background: #4f8f86;
}

.summary-badge.expense {
  color: #d46a7e;
}

.summary-badge.expense .dot {
  background: #d46a7e;
}

/* ===== 필터 영역 ===== */
.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

button {
  padding: 6px 12px;
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
}

button.active {
  background: #5d6d97;
  color: white;
  border-color: #5d6d97;
}

.date-input,
.filter-select,
.search-input {
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.search-group {
  flex-grow: 1;
}

.search-input {
  width: 100%;
}

:deep(.date-picker .date-pill) {
  /* 1. 높이 및 크기 최적화 (다른 버튼과 맞추기) */
  height: auto !important;
  min-height: 0 !important;

  /* 2. 다른 요소(.search-input 등)와 똑같은 패딩과 테두리 적용 */
  padding: 6px 10px !important;
  border: 1px solid #ddd !important;
  border-radius: 4px !important;

  /* 3. 폰트 크기도 비슷하게 맞춤 */
  font-size: 15px;

  /* 2. 줄바꿈 방지 및 내부 정렬 (가로 한 줄 유지) */
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px; /* 화살표와 날짜 사이 간격 */
  white-space: nowrap; /* 텍스트 줄바꿈 절대 금지 */
  min-width: 155px; /* 날짜가 길어져도 틀이 깨지지 않게 최소 너비 확보 */
}

/* 내부 글자가 찌그러지지 않도록 고정 */
:deep(.date-picker .date-pill span) {
  flex-shrink: 0;
  display: inline-block;
}

/* 화살표 버튼 크기도 인풋창 높이에 맞춰 미세 조정 */
:deep(.date-picker .date-arrow) {
  font-size: 14px;
  width: 18px;
  height: 18px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ===== 빈 상태 ===== */
.empty-state {
  text-align: center;
  padding: 48px;
  color: #888888;
}

/* ===== 테이블 ===== */
.transaction-table {
  width: 100%;
  border-collapse: collapse;
  background-color: #ffffff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  /* 레이아웃 엔진 고정 */
  table-layout: fixed;
}

.transaction-table th:nth-child(1) {
  width: 150px;
  text-align: left;
} /* 날짜: 연도 표시 대비 */
.transaction-table th:nth-child(2) {
  width: 100px;
  text-align: left;
} /* 카테고리 */
.transaction-table th:nth-child(3) {
  width: auto;
  text-align: left;
} /* 메모: 남는 공간 다 차지 */
.transaction-table th:nth-child(4) {
  width: 200px;
  text-align: right;
} /* 금액 */
.transaction-table th:nth-child(5) {
  width: 100px;
  text-align: center;
} /* 유형 */

.transaction-table thead {
  background-color: #f8f9fa;
}

.transaction-table th {
  padding: 12px 16px;
  font-weight: 600;
  color: #555555;
  border-bottom: 2px solid #e0e0e0;
}

.transaction-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: middle;
  white-space: nowrap;
}

.transaction-table td:last-child {
  text-align: center;
}

.transaction-row {
  cursor: pointer;
  transition: background-color 0.2s;
}

.transaction-row:hover {
  background-color: #f8f9fa;
}

.align-right {
  text-align: right;
}

.align-center {
  text-align: center;
}

.memo-cell {
  color: #555555;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ===== 카테고리 배지 ===== */
.category-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  color: #ffffff;
  font-weight: 500;
}

/* ===== 금액 ===== */
.price-cell {
  font-weight: 600;
  text-align: right;
}

.price-cell.income {
  color: #4f8f86;
}

.price-cell.expense {
  color: #d46a7e;
}

/* ===== 유형 배지 ===== */
.type-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.type-badge.income {
  background-color: #d4edda;
  color: #4f8f86;
}

.type-badge.expense {
  background-color: #f8d7da;
  color: #d46a7e;
}

.filter-container {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  background: #fff;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}
</style>
