<template>
  <div class="monthly-summary-container">
    <header class="summary-header">
      <div class="month-selector">
        <button class="arrow-btn" @click="prevMonth">&lt;</button>
        
        <h2 @click="showMonthPicker = true" class="date-title">
          {{ formattedDate }} 재정 요약
        </h2>
        
        <button class="arrow-btn" @click="nextMonth">&gt;</button>
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

    <MonthPicker 
      v-if="showMonthPicker" 
      :initialDate="store.currentMonth"
      @confirm="handleMonthConfirm"
      @close="showMonthPicker = false"
    />

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
import MonthPicker from '@/components/monthly/MonthPicker.vue';

const store = useMonthlyStore();

const showMonthPicker = ref(false);
const showCalendarLeft = ref(false);
const showCalendarRight = ref(false);
const compareRangeLeft = ref(null);
const compareRangeRight = ref(null);
const fixedCompareLabel = ref(null);

onMounted(() => {
  store.fetchAll();
  const [y, m] = store.currentMonth.split('-').map(Number);
  const prevDate = new Date(y, m - 2);
  fixedCompareLabel.value = `${prevDate.getMonth() + 1}월`;
});

const formattedDate = computed(() => {
  const [year, month] = store.currentMonth.split('-');
  return `${year}년 ${parseInt(month)}월`;
});

// MonthPicker에서 [확인] 눌렀을 때만 작동
const handleMonthConfirm = (newYearMonth) => {
  store.currentMonth = newYearMonth;
  store.fetchAll();
  showMonthPicker.value = false;
};

const prevMonth = () => store.prevMonth();
const nextMonth = () => store.nextMonth();

const handleConfirmLeft = (range) => {
  compareRangeLeft.value = range;
  showCalendarLeft.value = false;
  const month = range.start.split('-')[1];
  fixedCompareLabel.value = `${parseInt(month)}월`;
  if (compareRangeRight.value) store.setCompareRange(range, compareRangeRight.value);
};

const handleConfirmRight = (range) => {
  compareRangeRight.value = range;
  showCalendarRight.value = false;
  if (compareRangeLeft.value) store.setCompareRange(compareRangeLeft.value, range);
};

const leftLabel = computed(() => {
  if (compareRangeLeft.value) return `${compareRangeLeft.value.start} ~ ${compareRangeLeft.value.end}`;
  const [y, m] = store.currentMonth.split('-').map(Number);
  const prevDate = new Date(y, m - 2);
  return `${prevDate.getFullYear()}년 ${prevDate.getMonth() + 1}월`;
});

const rightLabel = computed(() => {
  if (compareRangeRight.value) return `${compareRangeRight.value.start} ~ ${compareRangeRight.value.end}`;
  return formattedDate.value;
});

const leftInitialDate = computed(() => {
  const [y, m] = store.currentMonth.split('-').map(Number);
  const prev = new Date(y, m - 2, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-01`;
});

const rightInitialDate = computed(() => `${store.currentMonth}-01`);

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
  margin-bottom: 10px; }
.monthly-summary-container { 
  box-shadow: 0 10px 30px rgba(17, 24, 39, 0.06);
  border: 1px solid #ececf1;
  padding: 20px 10px; 
  background: #fff;
  min-height: 100vh; 
  border-radius: 17px;
  width: 100%; 
  box-sizing: border-box; 
}
.summary-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  margin-bottom: 25px; 
}
.month-selector {
  display: flex; 
  align-items: center; 
  gap: 15px; 
}
.date-title { 
  margin: 0; 
  font-size: 30px; 
  font-weight: 800; 
  cursor: pointer; 
  color: #111827; 
}
.arrow-btn { 
  background: none; 
  border: none; 
  cursor: pointer; 
  font-size: 20px; 
  color: #000; 
  font-weight: bold; 
}
.card-grid { 
  display: grid; 
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
  gap: 20px; 
  margin-bottom: 30px; 
  font-size: 15px;
  font-weight: 700;
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
}
.comparison-picker button { 
  background: #fff; 
  border: 1px solid #ddd; 
  padding: 5px 12px; 
  border-radius: 6px; 
  cursor: pointer; 
  font-size: 13px; 
  }
  
</style>