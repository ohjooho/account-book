<template>
  <div class="monthly-chart">
    <div v-if="store.categories && store.categories.length > 0">
      <div class="chart-container">
        <div class="donut-chart" :style="chartStyle">
          <div class="inner-circle">
            <div class="center-text">
              <span class="month-label">{{ store.currentMonth.replace('-', '년 ') }}월 지출 1위</span>
              <span class="top-category">{{ topCategory?.name }}({{ topCategoryPercent }}%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else>데이터 로딩 중...</div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import {useMonthlyStore} from '@/stores/monthly';

const store = useMonthlyStore();

// 지출이 가장 큰 카테고리 찾기
const topCategory = computed(() => {
  return [...store.categories].sort((a, b) => b.amount - a.amount)[0];
});

const topCategoryPercent = computed(() => {
  if (!topCategory.value) return 0;
  return Math.round((topCategory.value.amount / store.expense) * 100);
});

// CSS conic-gradient 생성 로직
const chartStyle = computed(() => {
  let accumulated = 0;
  const gradientParts = store.categories.map(cat => {
    const start = accumulated;
    const end = start + (cat.amount / store.expense) * 100;
    accumulated = end;
    return `${cat.color} ${start}% ${end}%`;
  });
  
  return {
    background: `conic-gradient(${gradientParts.join(', ')})`
  };
});
</script>

<style scoped>
.chart-container { 
  display: flex; 
  justify-content: center; 
  align-items: center; 
  padding: 20px; 
}

.donut-chart {
  width: 280px;
  height: 280px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.inner-circle {
  width: 160px;
  height: 160px;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.center-text { 
  display: flex; 
  flex-direction: column; 
}

.month-label { 
  font-size: 14px; 
  color: #666;
  margin-bottom: 4px; 
}

.top-category { 
  font-size: 18px; 
  font-weight: bold; 
}

.monthly-chart { 
  padding-top: 50px; 
}

</style>