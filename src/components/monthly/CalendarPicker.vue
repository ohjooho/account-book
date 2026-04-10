<template>
  <div class="calendar-modal-overlay" @click.self="$emit('close')">
    <div class="calendar-container">
      <div class="calendar-header">
        <button class="nav-btn" @click.stop="viewMode === 'date' ? changeMonth(-1) : shiftYearRange(-12)">◀</button>
        <button class="calendar-title" @click.stop="toggleYearView">{{ headerLabel }}</button>
        <button class="nav-btn" @click.stop="viewMode === 'date' ? changeMonth(1) : shiftYearRange(12)">▶</button>
      </div>

      <template v-if="viewMode === 'date'">
        <div class="weekdays-grid">
          <div v-for="day in weekdays" :key="day" class="weekday">{{ day }}</div>
        </div>

        <div class="calendar-grid">
          <div v-for="empty in firstDayOfWeek" :key="`empty-${empty}`" class="calendar-day empty"></div>
          
          <div 
            v-for="day in daysInMonth" 
            :key="day" 
            class="calendar-day"
            :class="getDayClass(day)"
            @click="handleDateClick(day)"
          >
            <span class="day-text">{{ day }}</span>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="year-grid">
          <button
            v-for="year in yearRange"
            :key="year"
            class="year-button"
            :class="{ selected: year === viewDate.getFullYear() }"
            @click="selectYear(year)"
          >
            {{ year }}
          </button>
        </div>
      </template>

      <div class="calendar-footer">
        <button class="footer-btn cancel" @click="$emit('close')">취소</button>
        <button 
          class="footer-btn confirm" 
          @click="onConfirm" 
          :disabled="isRangeMode && !selectedEnd"
        >
          확인
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

const props = defineProps({
  initialDate: { type: String, default: '2026-04-01' },
  isRangeMode: { type: Boolean, default: true }
});

const emit = defineEmits(['confirm', 'close']);

const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

const viewDate = ref(new Date());
const selectedStart = ref(null);
const selectedEnd = ref(null);
const viewMode = ref('date'); // 'date' or 'year'
const yearPageStart = ref(new Date().getFullYear() - 6);

onMounted(() => {
  if (props.initialDate) {
    const [y, m, d] = props.initialDate.split('-').map(Number);
    viewDate.value = new Date(y, m - 1, d);
    yearPageStart.value = y - 6;
    if (!props.isRangeMode) {
      selectedStart.value = props.initialDate;
    }
  }
});

const headerLabel = computed(() => {
  if (viewMode.value === 'year') {
    const first = yearRange.value[0];
    const last = yearRange.value[yearRange.value.length - 1];
    return `${first} - ${last}`;
  }
  const year = viewDate.value.getFullYear();
  const month = String(viewDate.value.getMonth() + 1).padStart(2, '0');
  return `${year}년 ${month}월`;
});

const yearRange = computed(() => {
  const years = [];
  for (let i = 0; i < 12; i++) {
    years.push(yearPageStart.value + i);
  }
  return years;
});

const daysInMonth = computed(() => {
  const year = viewDate.value.getFullYear();
  const month = viewDate.value.getMonth();
  return new Date(year, month + 1, 0).getDate();
});

const firstDayOfWeek = computed(() => {
  const year = viewDate.value.getFullYear();
  const month = viewDate.value.getMonth();
  return new Date(year, month, 1).getDay();
});

const changeMonth = (offset) => {
  const newDate = new Date(viewDate.value);
  newDate.setMonth(newDate.getMonth() + offset);
  viewDate.value = newDate;
};

const toggleYearView = () => {
  viewMode.value = viewMode.value === 'date' ? 'year' : 'date';
};

const selectYear = (year) => {
  const newDate = new Date(viewDate.value);
  newDate.setFullYear(year);
  viewDate.value = newDate;
  viewMode.value = 'date';
};

const shiftYearRange = (amount) => {
  yearPageStart.value += amount;
};

const handleDateClick = (day) => {
  const clickedDateObj = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth(), day);
  const dateStr = formatDate(clickedDateObj);
  
  if (!props.isRangeMode) {
    selectedStart.value = dateStr;
    selectedEnd.value = null;
    return;
  }

  if (!selectedStart.value || (selectedStart.value && selectedEnd.value)) {
    selectedStart.value = dateStr;
    selectedEnd.value = null;
  } else {
    if (clickedDateObj < new Date(selectedStart.value)) {
      selectedStart.value = dateStr;
    } else {
      selectedEnd.value = dateStr;
    }
  }
};

const formatDate = (dateObj) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getDayClass = (day) => {
  const current = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth(), day);
  const dateStr = formatDate(current);
  const todayStr = formatDate(new Date());
  
  const start = selectedStart.value ? new Date(selectedStart.value) : null;
  const end = selectedEnd.value ? new Date(selectedEnd.value) : null;

  return {
    'is-sunday': current.getDay() === 0,
    'is-saturday': current.getDay() === 6,
    'is-today': dateStr === todayStr,
    'is-selected': (dateStr === selectedStart.value || dateStr === selectedEnd.value) && !selectedEnd.value,
    'range-start': dateStr === selectedStart.value && selectedEnd.value !== null,
    'range-end': dateStr === selectedEnd.value && selectedEnd.value !== null,
    'in-range': start && end && current > start && current < end
  };
};

const onConfirm = () => {
  if (props.isRangeMode) {
    if (selectedStart.value && selectedEnd.value) {
      emit('confirm', { start: selectedStart.value, end: selectedEnd.value });
    }
  } else {
    if (selectedStart.value) {
      emit('confirm', { start: selectedStart.value });
    }
  }
};
</script>

<style scoped>

.calendar-modal-overlay { 
position: fixed; 
top: 0; 
left: 0; 
width: 100%; 
height: 100%; 
background: rgba(0,0,0,0.5); 
display: flex; 
justify-content: center; 
align-items: center; 
z-index: 2000; 
}

.calendar-container { 
background: rgba(255, 255, 255, 0.98); 
border-radius: 17px; 
width: 320px; 
border: 1px solid #d9d9df; 
box-shadow: 0 12px 28px rgba(0,0,0,0.12); 
overflow: hidden; 
}

.calendar-header { 
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

.calendar-title:hover { 
background: transparent; 
}

.nav-btn { 
background: none; 
border: none; 
font-size: 16px; 
color: #111; 
cursor: pointer; 
padding: 0 10px; 
}

.weekdays-grid, .calendar-grid { 
display: grid; 
grid-template-columns: repeat(7, 1fr); 
gap: 0; 
padding: 8px; 
text-align: center; 
}
.weekday { 
font-size: 11px; 
color: #bbb; 
font-weight: 600; 
padding-bottom: 5px; 
}
.is-sunday { 
color: #f44336 !important; 
}
.is-saturday { 
color: #2196f3 !important; 
}

/* 날짜 기본 */
.calendar-day { 
font-size: 13px; 
color: #333; 
height: 36px; 
display: flex; 
justify-content: center; 
align-items: center; 
cursor: pointer; 
position: relative; 
width: 100%; 
box-sizing: border-box; 
}
.calendar-day.empty { 
cursor: default; 
}

/* 호버 효과 */
.calendar-day:not(.empty, .is-selected, .range-start, .range-end, .in-range):hover { 
background-color: #f0f0f0; 
border-radius: 10px; 
}

/* day-text 기본 - 항상 36x36 고정 및 둥근 정사각형 */
.day-text { 
width: 36px; 
height: 36px; 
display: flex; 
align-items: center; 
justify-content: center; 
border-radius: 10px; 
flex-shrink: 0; 
}

/* 단일 선택 스타일 */
.is-selected .day-text { 
background-color: #111; 
color: #fff; 
font-weight: bold; 
}

/* 형광펜 범위 스타일 (연회색) */
.in-range {
background-color: #e8e8e8; 
}
.in-range .day-text { 
  color: #111; 
}

/* 범위 시작일 배경 처리 */
.range-start { 
background: linear-gradient(to right, transparent 50%, #e8e8e8 50%); 
}
.range-start .day-text { 
  background-color: #111; 
  color: #fff; 
  font-weight: bold; 
}

/* 범위 종료일 배경 처리 */
.range-end { 
  background: linear-gradient(to left, transparent 50%, #e8e8e8 50%); 
}
.range-end .day-text { 
  background-color: #111; 
  color: #fff; 
  font-weight: bold; 
}

/* 오늘 날짜 표시 (하단 점) */
.is-today .day-text { 
  position: relative; 
}
.is-today .day-text::after { 
  content: ''; 
  position: absolute; 
  bottom: -3px; 
  left: 50%; 
  transform: translateX(-50%); 
  width: 4px; 
  height: 4px; 
  background-color: #111; 
  border-radius: 50%; 
}

/* 연도 선택 그리드 및 버튼 */
.year-grid { 
  display: grid; 
  grid-template-columns: repeat(3, 1fr); 
  gap: 12px; 
  padding: 12px; 
}
.year-button { 
  height: 48px; 
  border: 1px solid #d9d9df; 
  border-radius: 10px; 
  background: #fff; 
  color: #222; 
  font-size: 14px; 
  font-weight: 600; 
  cursor: pointer; 
}
.year-button.selected { 
  background: #111; 
  color: #fff; 
  border-color: #111; 
}
.year-button:hover { 
  background: #f0f0f0; 
}

.calendar-footer { 
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

/* 확인 버튼 스타일 */
.footer-btn.confirm { 
  background: #111; 
  color: #fff; 
}
.footer-btn.confirm:disabled { 
  background: #ccc; 
  cursor: not-allowed; 
  }
</style>