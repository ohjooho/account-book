<template>
  <div class="month-modal-overlay" @click.self="$emit('close')">
    <div class="month-container">
      <div class="month-header">
        <button class="nav-btn" @click="changeYear(-1)">&lt;</button>
        <button class="calendar-title" @click="isYearMode = !isYearMode">
          {{ currentYear }}년
        </button>
        <button class="nav-btn" @click="changeYear(1)">&gt;</button>
      </div>

      <div class="selection-grid">
        <template v-if="isYearMode">
          <button 
            v-for="y in yearOptions" :key="y" 
            class="grid-item"
            :class="{ active: y === currentYear }"
            @click="selectYear(y)"
          >
            {{ y }}
          </button>
        </template>
        <template v-else>
          <button 
            v-for="m in 12" :key="m" 
            class="grid-item"
            :class="{ active: tempMonth === m }"
            @click="tempMonth = m"
          >
            {{ m }}월
          </button>
        </template>
      </div>

      <div class="month-footer">
        <button class="footer-btn cancel" @click="$emit('close')">취소</button>
        <button class="footer-btn confirm" @click="handleConfirm">확인</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  initialDate: { type: String, default: '' }
});
const emit = defineEmits(['confirm', 'close']);

// 부모로부터 받은 날짜를 연도/월로 분리
const initialParts = props.initialDate ? props.initialDate.split('-') : [];
const initY = initialParts[0] ? parseInt(initialParts[0]) : new Date().getFullYear();
const initM = initialParts[1] ? parseInt(initialParts[1]) : new Date().getMonth() + 1;

const currentYear = ref(initY);
const tempMonth = ref(initM); // 임시 선택 값
const isYearMode = ref(false);

const yearOptions = computed(() => {
  const years = [];
  for (let i = currentYear.value - 5; i <= currentYear.value + 6; i++) {
    years.push(i);
  }
  return years;
});

const changeYear = (offset) => { currentYear.value += offset; };
const selectYear = (y) => { currentYear.value = y; isYearMode.value = false; };

// 확인 버튼 핸들러
const handleConfirm = () => {
  const formattedMonth = String(tempMonth.value).padStart(2, '0');
  emit('confirm', `${currentYear.value}-${formattedMonth}`);
};
</script>

<style scoped>
.month-modal-overlay {
  position: fixed; 
  top: 0; 
  left: 0; 
  width: 100%; 
  height: 100%;
  background: rgba(0,0,0,0.5); 
  display: flex; 
  justify-content: center; 
  align-items: center; 
  z-index: 3000;
}
.month-container {
  background: rgba(255, 255, 255, 0.98); 
  border-radius: 17px; 
  width: 320px;
  border: 1px solid #d9d9df; 
  box-shadow: 0 12px 28px rgba(0,0,0,0.12); 
  overflow: hidden;
}
.month-header {
  display: flex; 
  justify-content: space-between; 
  align-items: center;
  padding: 12px 10px; 
  border-bottom: 1px solid #eee;
}
.calendar-title {
  border: none; 
  background: transparent; 
  cursor: pointer;
  font-size: 14px; 
  color: #555; 
  font-weight: 600; 
  padding: 4px 8px;
}
.nav-btn { 
    background: none; 
    border: none; 
    font-size: 16px; 
    color: #111; 
    cursor: pointer; 
    padding: 0 10px; 
    font-weight: bold; 
}
.selection-grid { 
    display: grid; 
    grid-template-columns: repeat(3, 1fr); 
    gap: 12px; 
    padding: 12px; 
}
.grid-item {
  height: 48px;
  border: 1px solid #d9d9df; 
  border-radius: 10px;
  background: #fff; 
  color: #222; 
  font-size: 14px; 
  font-weight: 600; 
  cursor: pointer;
}
/* 검정 테마 적용 */
.grid-item.active { 
    background: #111; 
    color: #fff; 
    border-color: #111; 
}
.grid-item:hover:not(.active) { 
    background: #f0f0f0; 
}

.month-footer { 
    display: flex; 
    justify-content: flex-end; 
    gap: 8px; 
    padding: 12px; 
    border-top: 1px solid #eee; 
}
.footer-btn { 
    padding: 8px 16px; 
    border-radius: 8px; 
    border: none; 
    font-size: 13px; 
    cursor: pointer; 
    font-weight: 600; 
}
.footer-btn.cancel { 
    background: #f1f3f5; 
    color: #495057; 
}
.footer-btn.confirm { 
    background: #111; 
    color: #fff; 
    }
</style>