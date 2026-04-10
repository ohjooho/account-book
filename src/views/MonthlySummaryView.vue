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
        :amount="
          store.compareIncome && store.compareExpense
            ? store.compareIncome.right - store.compareExpense.right
            : store.netProfit
        "
        :diffAmount="
          store.compareIncome && store.compareExpense
            ? store.compareIncome.diff - store.compareExpense.diff
            : store.diffNetProfit
        "
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
import { computed, onMounted, ref } from 'vue';
import { useMonthlyStore } from '@/stores/monthly';

import BudgetBar from '@/components/monthly/BudgetBar.vue';
import CalendarPicker from '@/components/monthly/CalendarPicker.vue';
import CategoryList from '@/components/monthly/CategoryList.vue';
import MonthlyChart from '@/components/monthly/MonthlyChart.vue';
import SummaryCard from '@/components/monthly/SummaryCard.vue';

const store = useMonthlyStore();
const showCalendarLeft = ref(false);
const showCalendarRight = ref(false);
const compareRangeLeft = ref(null);
const compareRangeRight = ref(null);
const fixedCompareLabel = ref(null);

const leftInitialDate = computed(() => {
  const [year, month] = store.currentMonth.split('-').map(Number);
  const prevDate = new Date(year, month - 2, 1);
  return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-01`;
});

const rightInitialDate = computed(() => `${store.currentMonth}-01`);

onMounted(() => {
  store.fetchAll();

  const [year, month] = store.currentMonth.split('-').map(Number);
  const prevDate = new Date(year, month - 2);
  fixedCompareLabel.value = `${prevDate.getMonth() + 1}월`;
});

const formattedDate = computed(() => {
  const [year, month] = store.currentMonth.split('-');
  return `${year}년 ${parseInt(month)}월`;
});

const prevMonth = () => store.prevMonth();
const nextMonth = () => store.nextMonth();

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
  if (compareRangeLeft.value) {
    return `${compareRangeLeft.value.start} ~ ${compareRangeLeft.value.end}`;
  }

  const [year, month] = store.currentMonth.split('-').map(Number);
  const prevDate = new Date(year, month - 2);
  return `${prevDate.getFullYear()}년 ${prevDate.getMonth() + 1}월`;
});

const rightLabel = computed(() => {
  if (compareRangeRight.value) {
    return `${compareRangeRight.value.start} ~ ${compareRangeRight.value.end}`;
  }

  return formattedDate.value;
});

const compareLabel = computed(() => {
  if (fixedCompareLabel.value) {
    return fixedCompareLabel.value;
  }

  const [year, month] = store.currentMonth.split('-').map(Number);
  const prevDate = new Date(year, month - 2);
  return `${prevDate.getMonth() + 1}월`;
});
</script>

<style scoped>
.loading-overlay {
  margin-bottom: 10px;
  color: #0052cc;
  font-weight: bold;
  text-align: center;
}

.monthly-summary-container {
  width: 100%;
  min-height: 100vh;
  padding: 20px 10px;
  box-sizing: border-box;
  background: #fff;
}

.summary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 25px;
  flex-wrap: nowrap;
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

.month-selector button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 20px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.budget-section {
  margin-bottom: 10px;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 40px;
}

.category-list-area h3 {
  margin-bottom: 20px;
  font-size: 18px;
  font-weight: 700;
}

.badge {
  margin-right: 8px;
  padding: 2px 8px;
  border-radius: 4px;
  background: #eee;
  font-size: 12px;
}

.comparison-picker {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.comparison-picker button {
  width: auto;
  max-width: 200px;
  overflow: visible;
  padding: 5px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: clamp(9px, 1.2vw, 13px);
  white-space: nowrap;
}
</style>
