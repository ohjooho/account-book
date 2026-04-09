<template>
  <div class="budget-container">
    <div class="budget-info">
      <div class="emoji-status">{{ store.budgetEmoji }}</div>
      <div class="text-group">
        <div class="top-row">
          <span class="main-label">
            남은 예산 <strong>₩ {{ store.remainingBudget.toLocaleString() }}</strong>
          </span>
          <span class="percent-label">현재 {{ store.usedPercentage }}% 사용 중</span>
        </div>
        <div class="bottom-row">
          이번 달 예산 {{ store.budgetLimit.toLocaleString() }}원
          <button class="edit-btn" @click="handleEditBudget">✎</button>
        </div>
      </div>
    </div>
    
    <div class="progress-track">
      <div 
        class="progress-fill" 
        :style="{ width: store.usedPercentage + '%', backgroundColor: barColor }"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useMonthlyStore } from '@/stores/monthly'

const store = useMonthlyStore();

const barColor = computed(() => {
  if (store.usedPercentage < 60) return '#E8A0A8';   /* 연한 분홍 */
  if (store.usedPercentage < 80) return '#F8B333';   /* 노랑 */
  if (store.usedPercentage < 100) return '#E57373';  /* 주황 */
  return '#d63031';                                   /* 빨강 */
});

const handleEditBudget = () => {
  const newBudget = prompt('새로운 목표 금액을 입력하세요', store.budgetLimit);
  if (newBudget) store.setBudget(Number(newBudget));
};
</script>

<style scoped>
.budget-container {
  background: #FADADD; 
  padding: 15px 25px;
  border-radius: 15px;
  margin: 0;  /* 20px 0 → 0 */
}

.budget-info { 
  display: flex; 
  align-items: center;
  gap: 15px; 
  margin-bottom: 10px; 
}

.emoji-status { 
  font-size: 40px; 
}

.text-group { 
  flex: 1; 
}

.top-row { 
  display: flex; 
  justify-content: space-between; 
  align-items: flex-end; 
}

.main-label { 
  font-size: 18px; 
}

.percent-label { 
  font-size: 14px; 
  color: #666; 
}

.bottom-row { 
  font-size: 12px; 
  color: #999; 
  margin-top: 4px; 
}

.edit-btn { 
  background: none; 
  border: none; 
  cursor: pointer; 
  color: #ccc; 
}

.progress-track {
  height: 12px;
  background: #eee;
  border-radius: 6px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  transition: width 0.3s ease;
}
</style>