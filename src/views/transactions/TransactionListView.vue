<template>
  <div class="transaction-list-page">
    <!-- ===== 1. 달력 영역 (나중에 구현) ===== -->
    <section class="calendar-section">
      <div class="placeholder">📅 달력 영역 (나중에 구현 예정)</div>
    </section>

    <!-- ===== 2. 필터 영역 (나중에 구현) ===== -->
    <section class="filter-section">
      <div class="placeholder">
        🔍 필터 영역 (전체 / 오늘 / 이번 주 / 날짜 / 카테고리 / 메모 검색)
      </div>
    </section>

    <!-- ===== 3. 거래 목록 테이블 ===== -->
    <section class="list-section">
      <h2 class="section-title">거래 내역</h2>

      <!-- 데이터 없을 때 -->
      <div
        v-if="transactionsStore.transactions.length === 0"
        class="empty-state"
      >
        거래 내역이 없습니다.
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
            v-for="transaction in sortedTransactions"
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
import { onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useTransactionsStore } from '@/stores/transactions';
import { useCategoryStore } from '@/stores/category';

// Store 연결
const transactionsStore = useTransactionsStore();
const categoryStore = useCategoryStore();

// 라우터 사용 (페이지 이동)
const router = useRouter();

onMounted(async () => {
  await transactionsStore.fetchTransactions();
  await categoryStore.fetchCategories();
});

// functions

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
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
};

// 목록 아이템 클릭
const goToDetail = (id) => {
  router.push(`/transactions/${id}`);
};

// 날짜 최신순으로 정렬된 거래 목록
const sortedTransactions = computed(() => {
  // 원본 배열을 훼손하지 않기 위해 복사 후 정렬
  return [...transactionsStore.transactions].sort((a, b) => {
    // 날짜 내림차순 (최신이 위)
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    // 날짜가 같으면 id 내림차순 (큰 id = 나중에 추가된 것)
    return b.id - a.id;
  });
});
</script>

<style scoped>
/* ===== 페이지 전체 ===== */
.transaction-list-page {
  padding: 24px;
  max-width: 1200px;
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
}

.transaction-table thead {
  background-color: #f8f9fa;
}

.transaction-table th {
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #555555;
  border-bottom: 2px solid #e0e0e0;
}

.transaction-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
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

.memo-cell {
  color: #555555;
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
}

.price-cell.income {
  color: #28a745;
}

.price-cell.expense {
  color: #dc3545;
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
  color: #155724;
}

.type-badge.expense {
  background-color: #f8d7da;
  color: #721c24;
}
</style>
