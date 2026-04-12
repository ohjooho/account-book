<template>
  <div
    class="category-list"
    v-if="store.categories && store.categories.length > 0"
  >
    <div
      v-for="cat in store.categories"
      :key="cat.id"
      class="category-item"
      @click="goToDetail(cat.id)"
    >
      <div class="icon-box" :style="{ backgroundColor: cat.color }">
        {{ cat.icon }}
      </div>

      <div class="info-group">
        <div class="row">
          <span class="name">{{ cat.name }}</span>
          <span class="amount-group">
            <span class="amount">₩ {{ cat.amount.toLocaleString() }}</span>
            <span class="percent">{{ getPercent(cat.amount) }}%</span>
          </span>
        </div>

        <div class="bar-track">
          <div
            class="bar-fill"
            :style="{
              width: getPercent(cat.amount) + '%',
              backgroundColor: cat.color,
            }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useMonthlyStore } from '@/stores/monthly';

const store = useMonthlyStore();
const router = useRouter();

const getPercent = (amount) => {
  return Math.round((amount / store.expense) * 100);
};

const goToDetail = (categoryId) => {
  router.push({
    path: '/transactions',
    query: { category: categoryId, yearMonth: store.currentMonth },
  });
  // 카테고리 클릭 시 거래내역 페이지로 이동
  // query로 categoryId, month 전달 → 담당자가 필터링 처리
};
</script>

<style scoped>
.category-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.category-item {
  display: flex;
  align-items: center;
  gap: 15px;
  cursor: pointer;
  padding: 10px 5px;
  border-radius: 0px;
  transition: background 0.2s;
  border-bottom: 1px solid #e0e0e0;
}
.category-item:hover {
  background: #f0f0f0;
}
.icon-box {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}
.info-group {
  flex: 1;
}
.row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  align-items: baseline;
}
.name {
  font-weight: bold;
  font-size: 16px;
}

.amount {
  font-weight: bold;
  margin-right: 8px;
}

.percent {
  color: #999;
  font-size: 14px;
}

.bar-track {
  height: 6px;
  background: #eee;
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  transition: width 0.5s ease-out;
}
</style>
