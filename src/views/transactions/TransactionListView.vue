<template>
  <div class="transaction-list-page">
    <!-- ===== 1. 달력 영역 (나중에 구현) ===== -->
    <section class="calendar-section">
      <div class="placeholder">📅 달력 영역 (나중에 구현 예정)</div>
    </section>

    <!-- ===== 2. 필터 영역 (나중에 구현) ===== -->
    <section class="filter-section">
      <div class="filter-container">
        <div class="filter-group">
          <button
            :class="{ active: filter.period === 'all' }"
            @click="setPeriod('all')"
          >
            전체
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
          <input type="date" v-model="filter.startDate" class="date-input" />
          <span>~</span>
          <input type="date" v-model="filter.endDate" class="date-input" />
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
            @input="(e) => (filter.searchQuery = e.target.value)"
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
import { onMounted, computed, reactive, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useTransactionsStore } from '@/stores/transactions';
import { useCategoryStore } from '@/stores/category';

// Store 연결
const transactionsStore = useTransactionsStore();
const categoryStore = useCategoryStore();

// 라우터 사용 (페이지 이동)
const router = useRouter();
const route = useRoute();

// 필터 상태 관리
const filter = reactive({
  period: 'all',
  startDate: '',
  endDate: '',
  categoryId: '',
  searchQuery: '',
});

onMounted(async () => {
  await transactionsStore.fetchTransactions();
  await categoryStore.fetchCategories();
  // 페이지 로드 시 쿼리 파라미터가 있다면 필터에 적용
  applyQueryParams();
});

// functions

// 쿼리 파라미터 적용 함수
const applyQueryParams = () => {
  if (route.query.category) filter.categoryId = route.query.category;
  if (route.query.yearMonth) {
    // month가 2026-04 형식으로 오면 해당 월의 시작일과 종료일 설정
    const filterYearMonth = route.query.yearMonth;
    const filterYear = parseInt(filterYearMonth.split('-')[0]);
    const filterMonth = parseInt(filterYearMonth.split('-')[1]);

    filter.startDate = `${filterYearMonth}-01`;
    const lastDay = new Date(filterYear, filterMonth, 0).getDate();
    filter.endDate = `${route.query.yearMonth}-${lastDay}`;
  }
};

// 라우트 쿼리 변경 감시
watch(
  () => route.query,
  () => {
    applyQueryParams();
  },
  { deep: true },
);

// 기간 버튼 클릭 핸들러
const setPeriod = (p) => {
  filter.period = p;
  const now = new Date();

  // 오늘 날짜를 YYYY-MM-DD 형식으로 변환
  const getTodayStr = () => {
    return now.toISOString().split('T')[0];
  };

  if (p === 'today') {
    // YYYY-MM-DD 형식으로 변환
    const todayStr = getTodayStr();
    filter.startDate = todayStr;
    filter.endDate = todayStr;
  } else if (p === 'month') {
    // 1. 현재 연도와 월 YYYY-MM 형식으로 추출
    const currentYearMonth = getTodayStr().slice(0, 7);

    // 2. 이번 달의 마지막 날 계산
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const lastDay = new Date(year, month, 0).getDate();

    filter.startDate = `${currentYearMonth}-01`;
    console.log(filter.startDate);
    filter.endDate = `${currentYearMonth}-${lastDay}`;
  } else if (p === 'all') {
    filter.startDate = '';
    filter.endDate = '';
  }
  // 'month' 로직 추가 예정
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

// 날짜 최신순으로 정렬된 거래 목록
// const sortedTransactions = computed(() => {
//   // 원본 배열을 훼손하지 않기 위해 복사 후 정렬
//   return [...transactionsStore.transactions].sort((a, b) => {
//     // 날짜 내림차순 (최신이 위)
//     if (a.date !== b.date) {
//       return b.date.localeCompare(a.date);
//     }
//     // 날짜가 같으면 id 내림차순 (큰 id = 나중에 추가된 것)
//     return b.id - a.id;
//   });
// });
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

/* ===== Placeholder (나중에 구현될 영역) ===== */
.placeholder {
  background-color: #f5f5f5;
  border: 2px dashed #cccccc;
  padding: 24px;
  text-align: center;
  color: #888888;
  border-radius: 8px;
}

/* ===== 달력 영역 ===== */
.calendar-section .placeholder {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

/* ===== 필터 영역 ===== */
.filter-section .placeholder {
  min-height: 60px;
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
  background: #4f8f86;
  color: white;
  border-color: #4f8f86;
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
</style>
