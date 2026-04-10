<template>
  <div class="category-detail-container">
    <header class="detail-header">
      <div class="month-navigation">
        <button class="nav-btn">＜</button>
        <h1 @click="openCalendar('main')">{{ mainMonthText }} 재정 요약</h1>
        <button class="nav-btn">＞</button>
      </div>
    </header>

    <div class="comparison-picker">
      <span class="badge">비교기간</span>
      <div class="date-selector-wrapper">
        <button class="date-btn" @click="openCalendar('compare1')">{{ compareMonth1 }}</button>
        <span class="separator">|</span>
        <button class="date-btn" @click="openCalendar('compare2')">{{ compareMonth2 }}</button>
        <span class="separator">▾</span>
      </div>
    </div>

    <CalendarPicker 
      v-if="showCalendar"
      :initialDate="activeDate"
      @confirm="handleConfirm"
      @close="showCalendar = false"
    />

    <div class="stats-grid">
      </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import CalendarPicker from '@/components/monthly/CalendarPicker.vue';

const showCalendar = ref(false);
const activeDate = ref(''); // 현재 달력에 넘겨줄 날짜
const currentTarget = ref(''); // 지금 바꾸려는 대상이 누구인지 (main / compare1 / compare2)

// UI에 표시될 텍스트들 (데이터 자동 반영용)
const mainMonthText = ref('2026년 04월');
const compareMonth1 = ref('2026년 3월');
const compareMonth2 = ref('2026년 4월');

// 1. 클릭 시 어떤 버튼을 눌렀는지에 따라 날짜 설정
const openCalendar = (target) => {
  currentTarget.value = target;
  
  if (target === 'main') activeDate.value = '2026-04-01';
  else if (target === 'compare1') activeDate.value = '2026-03-01';
  else if (target === 'compare2') activeDate.value = '2026-04-01';
  
  showCalendar.value = true;
};

// 2. 캘린더에서 '확인' 누르면 해당 버튼의 텍스트만 쏙 바뀜 (데이터 자동 반영)
const handleConfirm = (data) => {
  const [year, month] = data.start.split('-');
  const formatted = `${year}년 ${parseInt(month)}월`;

  if (currentTarget.value === 'main') {
    mainMonthText.value = formatted;
  } else if (currentTarget.value === 'compare1') {
    compareMonth1.value = formatted;
  } else if (currentTarget.value === 'compare2') {
    compareMonth2.value = formatted;
  }

  showCalendar.value = false;
  // TODO: 여기서 실제로 API를 호출하거나 스토어 데이터를 갱신하면 차트/숫자가 바뀜.
};
</script>

<style scoped>
/* 이미지의 가로 배치 스타일 재현 */
.date-selector-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #ddd;
  padding: 8px 15px;
  border-radius: 12px;
}

.date-btn { background: none; 
  border: none; 
  cursor: pointer; 
  font-weight: 500; 
}

.month-navigation { 
  display: flex; 
  align-items: center; 
  gap: 15px; 
  justify-content: center; 
}

.nav-btn { 
  background: none; 
  border: none; 
  font-size: 24px; 
  cursor: pointer; 
  }

</style>