<template>
  <div class="calendar-modal-overlay" @click.self="$emit('close')">
    <div class="calendar-container">
      <div class="calendar-header">
        <button class="nav-btn" @click.stop="changeMonth(-1)">◀</button>
        <h3>{{ calendarTitle }}</h3>
        <button class="nav-btn" @click.stop="changeMonth(1)">▶</button>
      </div>

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

onMounted(() => {
  if (props.initialDate) {
    const [y, m, d] = props.initialDate.split('-').map(Number);
    viewDate.value = new Date(y, m - 1, d);
    if (!props.isRangeMode) {
      selectedStart.value = props.initialDate;
    }
  }
});

const calendarTitle = computed(() => {
  const year = viewDate.value.getFullYear();
  const month = String(viewDate.value.getMonth() + 1).padStart(2, '0');
  return `${year}년 ${month}월`;
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
  background: #fff; 
  border-radius: 16px; 
  width: 320px; 
  box-shadow: 0 10px 30px rgba(0,0,0,0.15); 
  overflow: hidden; 
}

.calendar-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  padding: 15px 10px; 
  border-bottom: 1px solid #eee; 
}

.calendar-header h3 { 
  margin: 0; 
  font-size: 16px; 
  font-weight: 700; 
  color: #333; 
}

.nav-btn { 
  background: none; 
  border: none; 
  font-size: 18px; 
  color: #999; 
  cursor: pointer; 
  padding: 0 10px; 
}

.nav-btn:hover { 
  color: #333; 
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
.calendar-day.empty { cursor: default; }
.calendar-day:not(.empty, .is-selected, .range-start, .range-end, .in-range):hover { background-color: #f5f5f5; border-radius: 50%; }

/* day-text 기본 - 항상 36x36 고정 */
.day-text {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
}

/* 단일 선택 */
.is-selected .day-text { 
  background-color: #007bff;
  color: #fff;
  font-weight: bold; 
}

/* 범위 중간 */
.in-range { background-color: #e3f2fd; }
.in-range .day-text { color: #007bff; }

/* 시작일 */
.range-start { 
  background: linear-gradient(to right, transparent 50%, #e3f2fd 50%);
}
.range-start .day-text { 
  background-color: #007bff; 
  color: #fff;
  font-weight: bold; 
}

/* 끝일 */
.range-end { 
  background: linear-gradient(to left, transparent 50%, #e3f2fd 50%);
}
.range-end .day-text { 
  background-color: #007bff;
  color: #fff;
  font-weight: bold; 
}

.is-today .day-text { position: relative; }
.is-today .day-text::after { content: ''; position: absolute; bottom: -3px; left: 50%; transform: translateX(-50%); width: 4px; height: 4px; background-color: #007bff; border-radius: 50%; }

.calendar-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 12px; border-top: 1px solid #eee; }
.footer-btn { padding: 8px 16px; border-radius: 8px; border: none; font-size: 13px; cursor: pointer; font-weight: 600; }
.footer-btn.cancel { background: #f1f3f5; color: #495057; }
.footer-btn.confirm { background: #007bff; color: #fff; }
.footer-btn.confirm:disabled { background: #ccc; cursor: not-allowed; }
</style>