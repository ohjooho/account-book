<template>
  <div class="monthly-summary-container">
    <header class="summary-header">
      <div class="month-selector">
        <button @click="prevMonth">&lt;</button>
        <h2>{{ formattedDate }} 재정 요약</h2>
        <button @click="nextMonth">&gt;</button>
      </div>
      <div class="comparison-picker">
        <span class="badge">비교기간</span>
        <button @click="showCalendarLeft = true">{{ leftLabel }}</button>
        <span> | </span>
        <button @click="showCalendarRight = true">{{ rightLabel }}</button>
      </div>
    </header>

    <div v-if="store.loading" class="loading-overlay">데이터 동기화 중...</div>

    <section class="card-grid">
      <SummaryCard
          title="총 수입"
             :amount="store.compareIncome ? store.compareIncome.right : store.income"
             :diffAmount="store.compareIncome ? store.compareIncome.diff : store.diffIncome"
             :diffLabel="compareRangeLeft ? compareLabel : null"
             type="income"
        />
    <SummaryCard
         title="총 지출"
            :amount="store.compareExpense ? store.compareExpense.right : store.expense"
            :diffAmount="store.compareExpense ? store.compareExpense.diff : store.diffExpense"
            :diffLabel="compareRangeLeft ? compareLabel : null"
            type="expense"
                 />
    <SummaryCard
          title="순수익"
           :amount="store.compareIncome && store.compareExpense ? store.compareIncome.right - store.compareExpense.right : store.netProfit"
           :diffAmount="store.compareIncome && store.compareExpense ? store.compareIncome.diff - store.compareExpense.diff : store.diffNetProfit"
           :diffLabel="compareRangeLeft ? compareLabel : null"
           type="profit"
                  />
    </section>

    <section class="budget-section">
      <BudgetBar />
    </section>

    <div class="details-grid">
      <aside class="category-list-area">
        <h3>카테고리별 소비 지출 현황</h3>
        <CategoryList />
      </aside>
      <main class="chart-area">
        <MonthlyChart />
      </main>
    </div>

    <CalendarPicker
      v-if="showCalendarLeft"
      :initialDate="leftInitialDate"
      @close="showCalendarLeft = false"
      @confirm="handleConfirmLeft"
    />

    <CalendarPicker
      v-if="showCalendarRight"
      :initialDate="rightInitialDate"
      @close="showCalendarRight = false"
      @confirm="handleConfirmRight"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useMonthlyStore } from '@/stores/monthly';

import SummaryCard from '@/components/monthly/SummaryCard.vue';
import BudgetBar from '@/components/monthly/BudgetBar.vue';
import CategoryList from '@/components/monthly/CategoryList.vue';
import MonthlyChart from '@/components/monthly/MonthlyChart.vue';
import CalendarPicker from '@/components/monthly/CalendarPicker.vue';

const store = useMonthlyStore();

const leftInitialDate = computed(() => {
  const [y, m] = store.currentMonth.split('-').map(Number);
  const prev = new Date(y, m - 2, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-01`;
});

const rightInitialDate = computed(() => {
  return `${store.currentMonth}-01`;
});

onMounted(() => {
  store.fetchAll();
  // 초기 비교달 고정 (현재 월 기준 전달)
  const [y, m] = store.currentMonth.split('-').map(Number);
  const prevDate = new Date(y, m - 2);
  fixedCompareLabel.value = `${prevDate.getMonth() + 1}월`;
});

const formattedDate = computed(() => {
  const [year, month] = store.currentMonth.split('-');
  return `${year}년 ${parseInt(month)}월`;
});

const prevMonth = () => store.prevMonth();
const nextMonth = () => store.nextMonth();

const showCalendarLeft = ref(false);
const showCalendarRight = ref(false);
const compareRangeLeft = ref(null);
const compareRangeRight = ref(null);

const handleConfirmLeft = (range) => {
  compareRangeLeft.value = range;
  showCalendarLeft.value = false;
  const month = range.start.split('-')[1];
  fixedCompareLabel.value = `${parseInt(month)}월`;
  if (compareRangeRight.value) {
    store.setCompareRange(range, compareRangeRight.value);
  }
};

const handleConfirmRight = (range) => {
  compareRangeRight.value = range;
  showCalendarRight.value = false;
  if (compareRangeLeft.value) {
    store.setCompareRange(compareRangeLeft.value, range);
  }
};

const leftLabel = computed(() => {
  if (compareRangeLeft.value)
    return `${compareRangeLeft.value.start} ~ ${compareRangeLeft.value.end}`;
  const [y, m] = store.currentMonth.split('-').map(Number);
  const prevDate = new Date(y, m - 2);
  return `${prevDate.getFullYear()}년 ${prevDate.getMonth() + 1}월`;
});

const rightLabel = computed(() => {
  if (compareRangeRight.value)
    return `${compareRangeRight.value.start} ~ ${compareRangeRight.value.end}`;
  return formattedDate.value;
});

const fixedCompareLabel = ref(null);

const compareLabel = computed(() => {
  if (fixedCompareLabel.value) return fixedCompareLabel.value;
  const [y, m] = store.currentMonth.split('-').map(Number);
  const prevDate = new Date(y, m - 2);
  return `${prevDate.getMonth() + 1}월`;
});
</script>

<style scoped>
.loading-overlay {
  text-align: center;
  color: #0052cc;
  font-weight: bold;
  margin-bottom: 10px;
}

.monthly-summary-container {
  padding: 20px 10px;
  background: #fff;
  min-height: 100vh;
  /* 부모 틀 안에서 유연하게 작동하도록 설정 */
  width: 100%;
  box-sizing: border-box;
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  flex-wrap: nowrap; /* 절대 줄바꿈 금지 */
  gap: 10px;
}

.month-selector {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-shrink: 0;
}

.month-selector h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  white-space: nowrap;
}

/* ⭐ 화살표 버튼 스타일 원복: 테두리 없애고 투명하게 */
.month-selector button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 20px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ⭐ 카드 그리드: 반응형 로직 적용 (3열 유지하되 유연하게) */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.budget-section {
  margin-bottom: 10px;
}

/* ⭐ 하단 상세 영역: 겹침 방지 반응형 적용 */
.details-grid {
  display: grid;
  /* 평소엔 1.5:1 비율, 좁아지면 자동으로 아래로 */
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 40px;
}

.category-list-area h3 {
  font-size: 18px;
  margin-bottom: 20px;
  font-weight: 700;
}

.badge {
  background: #eee;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-right: 8px;
}

.comparison-picker {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.comparison-picker button {
  background: #fff;
  border: 1px solid #ddd;
  padding: 5px 12px;
  border-radius: 6px;
  cursor: pointer;
  max-width: 200px;
  width: auto;
  font-size: clamp(9px, 1.2vw, 13px);
  white-space: nowrap;
  overflow: visible;
}
</style>