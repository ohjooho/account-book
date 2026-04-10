<template>
  <div ref="pickerRef" class="date-picker">
    <div class="date-pill" @click="toggleCalendar">
      <button class="date-arrow" type="button" @click.stop="moveDate(-1)">
        ‹
      </button>
      <span>{{ formattedSelectedDate }}</span>
      <button class="date-arrow" type="button" @click.stop="moveDate(1)">
        ›
      </button>
    </div>

    <div v-if="isCalendarOpen" class="calendar-card" @click.stop>
      <div class="calendar-header">
        <button
          class="calendar-nav"
          type="button"
          @click="viewMode === 'date' ? moveMonth(-1) : shiftYearRange(-12)"
        >
          ‹
        </button>

        <button
          class="calendar-title"
          type="button"
          @click.stop="toggleYearView"
        >
          {{ headerLabel }}
        </button>

        <button
          class="calendar-nav"
          type="button"
          @click="viewMode === 'date' ? moveMonth(1) : shiftYearRange(12)"
        >
          ›
        </button>
      </div>

      <template v-if="viewMode === 'date'">
        <div class="calendar-grid calendar-weekdays">
          <span v-for="day in weekdayLabels" :key="day">{{ day }}</span>
        </div>

        <div class="calendar-grid calendar-days">
          <button
            v-for="day in calendarDays"
            :key="day.key"
            type="button"
            class="calendar-day"
            :class="{
              empty: !day.currentMonth,
              selected: day.currentMonth && isSameDate(day.date, selectedDate),
              future: day.currentMonth && day.isFuture,
            }"
            :disabled="!day.currentMonth || day.isFuture"
            @click="selectDate(day.date)"
          >
            {{ day.label }}
          </button>
        </div>
      </template>

      <template v-else>
        <div class="year-grid">
          <button
            v-for="year in yearRange"
            :key="year"
            type="button"
            class="year-button"
            :class="{ selected: year === currentMonth.getFullYear() }"
            @click="selectYear(year)"
          >
            {{ year }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  maxDate: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:modelValue']);

const isCalendarOpen = ref(false);
const pickerRef = ref(null);
const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const viewMode = ref('date'); // 'date' | 'year'

const startOfDay = (date) => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const parseDateString = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const today = computed(() => {
  if (props.maxDate) {
    return startOfDay(parseDateString(props.maxDate));
  }
  return startOfDay(new Date());
});

const selectedDate = ref(parseDateString(props.modelValue) || today.value);
const currentMonth = ref(
  new Date(selectedDate.value.getFullYear(), selectedDate.value.getMonth(), 1),
);
const yearPageStart = ref(currentMonth.value.getFullYear() - 6);

watch(
  () => props.modelValue,
  (newValue) => {
    const parsed = parseDateString(newValue);
    if (!parsed) return;
    selectedDate.value = parsed;
    currentMonth.value = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
  },
);

watch(
  () => currentMonth.value,
  (newMonth) => {
    yearPageStart.value = newMonth.getFullYear() - 6;
  },
);

const formattedSelectedDate = computed(() => {
  const year = selectedDate.value.getFullYear();
  const month = selectedDate.value.getMonth() + 1;
  const day = selectedDate.value.getDate();
  return `${year}년 ${month}월 ${day}일`;
});

const monthLabel = computed(() => {
  const year = currentMonth.value.getFullYear();
  const month = currentMonth.value.toLocaleString('en-US', { month: 'long' });
  return `${month} ${year}`;
});

const headerLabel = computed(() => {
  if (viewMode.value === 'year') {
    const first = yearRange.value[0];
    const last = yearRange.value[yearRange.value.length - 1];
    return `${first} - ${last}`;
  }

  const year = currentMonth.value.getFullYear();
  const month = currentMonth.value.getMonth() + 1;
  return `${year}년 ${month}월`;
});

const yearRange = computed(() => {
  const maxYear = today.value.getFullYear();
  const years = [];

  for (let i = 0; i < 12; i++) {
    const year = yearPageStart.value + i;
    if (year <= maxYear) {
      years.push(year);
    }
  }

  return years;
});

const calendarDays = computed(() => {
  const year = currentMonth.value.getFullYear();
  const month = currentMonth.value.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startWeekday = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const days = [];

  for (let i = 0; i < startWeekday; i++) {
    days.push({
      key: `empty-${i}`,
      label: '',
      currentMonth: false,
      date: null,
      isFuture: false,
    });
  }

  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month, day);
    days.push({
      key: formatDate(date),
      label: day,
      currentMonth: true,
      date,
      isFuture: date > today.value,
    });
  }

  return days;
});

const isSameDate = (a, b) => {
  if (!a || !b) return false;
  return formatDate(a) === formatDate(b);
};

const toggleCalendar = () => {
  isCalendarOpen.value = !isCalendarOpen.value;
};

const selectDate = (date) => {
  if (!date || date > today.value) return;

  selectedDate.value = new Date(date);
  currentMonth.value = new Date(date.getFullYear(), date.getMonth(), 1);
  emit('update:modelValue', formatDate(date));
  isCalendarOpen.value = false;
};

const moveDate = (direction) => {
  const next = new Date(selectedDate.value);
  next.setDate(next.getDate() + direction);

  if (next > today.value) {
    selectedDate.value = new Date(today.value);
    currentMonth.value = new Date(
      today.value.getFullYear(),
      today.value.getMonth(),
      1,
    );
    emit('update:modelValue', formatDate(today.value));
    isCalendarOpen.value = false;
    return;
  }

  selectedDate.value = next;
  currentMonth.value = new Date(next.getFullYear(), next.getMonth(), 1);
  emit('update:modelValue', formatDate(next));
  isCalendarOpen.value = false;
};

const moveMonth = (direction) => {
  const nextMonth = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() + direction,
    1,
  );

  const todayMonth = new Date(
    today.value.getFullYear(),
    today.value.getMonth(),
    1,
  );

  if (nextMonth > todayMonth) {
    currentMonth.value = todayMonth;
    return;
  }

  currentMonth.value = nextMonth;
};

const toggleYearView = () => {
  viewMode.value = viewMode.value === 'date' ? 'year' : 'date';
};

const selectYear = (year) => {
  const currentSelectedMonth = currentMonth.value.getMonth();
  const todayYear = today.value.getFullYear();
  const todayMonth = today.value.getMonth();

  let nextMonth = currentSelectedMonth;

  if (year === todayYear && nextMonth > todayMonth) {
    nextMonth = todayMonth;
  }

  currentMonth.value = new Date(year, nextMonth, 1);
  viewMode.value = 'date';
};

const shiftYearRange = (amount) => {
  const maxYear = today.value.getFullYear();
  const nextStart = yearPageStart.value + amount;

  if (nextStart > maxYear) return;
  yearPageStart.value = nextStart;
};

const handleClickOutside = (event) => {
  if (!pickerRef.value) return;
  if (!pickerRef.value.contains(event.target)) {
    isCalendarOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.date-picker {
  position: relative;
  width: 100%;
}

.date-pill {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  height: 42px;
  padding: 0 14px;
  background: #fff;
  color: #222;
  border: 1px solid #bcbcbc;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 500;
  box-sizing: border-box;
  cursor: pointer;
}

.date-arrow {
  width: 24px;
  height: 24px;
  border: 0;
  background: transparent;
  color: #222;
  font-size: 18px;
  cursor: pointer;
}

.calendar-card {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 20;
  width: 100%;
  min-width: 320px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid #d9d9df;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
  box-sizing: border-box;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 12px;
  color: #666;
}

.calendar-nav {
  border: 0;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  color: #111;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

.calendar-weekdays {
  margin-bottom: 8px;
  font-size: 12px;
  color: #666;
  text-align: center;
}

.calendar-days {
  font-size: 14px;
}

.calendar-day {
  width: 100%;
  aspect-ratio: 1 / 1;
  border: 0;
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  color: #111;
}

.calendar-day.selected {
  background: #111;
  color: #fff;
  font-weight: 600;
}

.calendar-day.empty {
  visibility: hidden;
}

.calendar-day.future {
  color: #c3c3c8;
  cursor: not-allowed;
}
.calendar-title {
  border: none;
  background: transparent;
  box-shadow: none;
  outline: none;
  cursor: pointer;
  font-size: 16px;
  color: #555;
  font-weight: 600;
  padding: 4px 8px;
}

.calendar-title:hover,
.calendar-title:focus,
.calendar-title:active {
  background: transparent;
  box-shadow: none;
  outline: none;
}

.year-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 12px 4px 4px;
}

.year-button {
  height: 48px;
  border: 1px solid #d9d9df;
  border-radius: 10px;
  background: #fff;
  color: #222;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.year-button.selected {
  background: #222;
  color: #fff;
}
</style>