<template>
  <div class="card">
    <div class="card-header" :class="type">
      <span class="label">{{ title }}</span>
    </div>
    <div class="amount">₩ {{ (amount ?? 0).toLocaleString() }}</div>
    <div :class="['diff', diffStatus]" v-if="diffLabel">
      {{ diffLabel }} 동기 대비 
      <span class="arrow">{{ (diffAmount ?? 0) >= 0 ? '↑' : '↓' }}</span>
      ₩ {{ Math.abs(diffAmount ?? 0).toLocaleString() }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  title: String,
  amount: Number,
  diffAmount: Number,
  type: String,
  diffLabel: String  // 추가
});

const diffLabel = computed(() => props.diffLabel ?? '이전달');

const diffStatus = computed(() => {
  if (props.type === 'expense') {
    return (props.diffAmount ?? 0) <= 0 ? 'good' : 'bad';
  }
  return (props.diffAmount ?? 0) >= 0 ? 'good' : 'bad';
});
</script>

<style scoped>
.card {
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.label { 
  color: #666; 
  font-size: 14px; 
  font-weight: bold; 
}

.amount { 
  font-size: 24px; 
  font-weight: 800; 
  margin: 10px 0; 
}

.diff { 
  font-size: 13px; 
  color: #999; 
}

.diff.good { 
  color: #27ae60; 
}

.diff.bad { 
  color: #e74c3c; 
}

.arrow { 
  font-weight: bold; 
  margin: 0 2px; 
}


.card-header {
  padding: 10px 15px;
  border-radius: 8px 8px 0 0;
  margin: -20px -20px 15px -20px;
}

.card-header.income {
  background-color: #4DBDAA; 
}

.card-header.expense { 
  background-color: #E57373; 
}

.card-header.profit { 
  background-color: #F8B333; 
}

.label { 
  color: #fff; 
  font-size: 14px; 
  font-weight: bold; 
  }

</style>