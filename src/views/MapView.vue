<template>
  <div class="map-page">
    <div class="map-toolbar">
      <div class="page-title-wrap">
        <h1 class="page-title">소비 지도</h1>
      </div>
    </div>

    <div class="map-board">
      <div class="date-pill" @click="isCalendarOpen = !isCalendarOpen">
        <button class="date-arrow" @click.stop="moveDate(-1)">‹</button>
        <span>{{ formattedSelectedDate }}</span>
        <button class="date-arrow" @click.stop="moveDate(1)">›</button>
      </div>

      <div class="category-stack">
        <button
          v-for="category in categories"
          :key="category.key"
          class="category-chip"
          :class="{ active: selectedCategory === category.key }"
          @click="selectCategory(category.key)"
        >
          {{ category.label }}
        </button>
      </div>

      <div v-if="isCalendarOpen" class="calendar-card">
        <div class="calendar-header">
          <button class="calendar-nav" @click="moveMonth(-1)">‹</button>
          <span>{{ monthLabel }}</span>
          <button class="calendar-nav" @click="moveMonth(1)">›</button>
        </div>

        <div class="calendar-grid calendar-weekdays">
          <span v-for="day in weekdayLabels" :key="day">{{ day }}</span>
        </div>

        <div class="calendar-grid calendar-days">
          <button
            v-for="day in calendarDays"
            :key="day.key"
            class="calendar-day"
            :class="{
              empty: !day.currentMonth,
              selected: day.currentMonth && isSameDate(day.date, selectedDate),
              future: day.currentMonth && day.isFuture
            }"
            :disabled="!day.currentMonth || day.isFuture"
            @click="selectDate(day.date)"
          >
            {{ day.label }}
          </button>
        </div>
      </div>

      <div ref="mapRef" class="map-area"></div>

      <div v-if="selectedItem" class="detail-card">
        <div class="detail-top">{{ selectedItem.title }}</div>

        <div class="detail-body">
          <div class="detail-left">
            <div class="detail-date">{{ selectedItem.date }}</div>
            <div class="detail-time">{{ selectedItem.time }}</div>
            <div class="detail-category">{{ selectedItem.categoryLabel }}</div>
            <div
              class="detail-amount"
              :class="selectedItem.type === 'income' ? 'income' : 'expense'"
            >
              {{ selectedItem.amount }}
            </div>
          </div>

          <div class="detail-right">
            <div class="pin-badge">{{ selectedItem.icon }}</div>
            <div class="detail-address">{{ selectedItem.address }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue'

const mapRef = ref(null)
const map = ref(null)
const markers = ref([])
const selectedCategory = ref('all')
const selectedItem = ref(null)
const isCalendarOpen = ref(false)
const transactions = ref([])

const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const categories = [
  { key: 'all', label: '전체' },
  { key: 'food', label: '식비' },
  { key: 'transport', label: '교통' },
  { key: 'shopping', label: '쇼핑' },
  { key: 'etc', label: '기타' }
]

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

const today = ref(startOfDay(new Date()))
const selectedDate = ref(startOfDay(new Date()))
const currentMonth = ref(new Date(today.value.getFullYear(), today.value.getMonth(), 1))

let dateCheckTimer = null

const placePool = {
  food: [
    {
      title: '스타벅스 홍대역점',
      address: '서울특별시 마포구 양화로 165',
      lat: 37.5563,
      lng: 126.9220,
      icon: '☕',
      baseAmount: 12000,
      time: '09:30'
    },
    {
      title: '맥도날드 홍대점',
      address: '서울특별시 마포구 홍익로 29',
      lat: 37.5571,
      lng: 126.9236,
      icon: '🍔',
      baseAmount: 8900,
      time: '13:10'
    },
    {
      title: '서브웨이 합정점',
      address: '서울특별시 마포구 양화로 45',
      lat: 37.5508,
      lng: 126.9139,
      icon: '🥪',
      baseAmount: 9800,
      time: '12:20'
    },
    {
      title: '이디야 연남점',
      address: '서울특별시 마포구 연남동',
      lat: 37.5621,
      lng: 126.9262,
      icon: '🥤',
      baseAmount: 5300,
      time: '16:15'
    },
    {
      title: '김밥천국 합정점',
      address: '서울특별시 마포구 합정동',
      lat: 37.5504,
      lng: 126.9142,
      icon: '🍙',
      baseAmount: 7500,
      time: '11:40'
    },
    {
      title: '메가커피 연남점',
      address: '서울특별시 마포구 연남동',
      lat: 37.5612,
      lng: 126.9258,
      icon: '🧋',
      baseAmount: 5500,
      time: '10:20'
    }
  ],
  transport: [
    {
      title: '지하철 2호선',
      address: '홍대입구역',
      lat: 37.5574,
      lng: 126.9242,
      icon: '🚇',
      baseAmount: 1400,
      time: '08:20'
    },
    {
      title: '버스 환승',
      address: '홍대입구역 버스정류장',
      lat: 37.5558,
      lng: 126.9251,
      icon: '🚌',
      baseAmount: 1500,
      time: '18:40'
    },
    {
      title: '택시',
      address: '합정역 인근',
      lat: 37.5499,
      lng: 126.9135,
      icon: '🚕',
      baseAmount: 11200,
      time: '22:10'
    },
    {
      title: '공항철도',
      address: '홍대입구역 공항철도',
      lat: 37.5570,
      lng: 126.9260,
      icon: '🚆',
      baseAmount: 4450,
      time: '07:50'
    },
    {
      title: '마을버스',
      address: '연남동 정류장',
      lat: 37.5604,
      lng: 126.9267,
      icon: '🚐',
      baseAmount: 1200,
      time: '09:05'
    },
    {
      title: '자전거 대여',
      address: '홍대입구역 대여소',
      lat: 37.5566,
      lng: 126.9248,
      icon: '🚲',
      baseAmount: 1000,
      time: '17:10'
    }
  ],
  shopping: [
    {
      title: '올리브영 홍대점',
      address: '서울특별시 마포구 어울마당로',
      lat: 37.5553,
      lng: 126.9212,
      icon: '🛍️',
      baseAmount: 23000,
      time: '15:20'
    },
    {
      title: '다이소 홍대점',
      address: '서울특별시 마포구 홍익로 6길',
      lat: 37.5568,
      lng: 126.9231,
      icon: '🛒',
      baseAmount: 8000,
      time: '19:05'
    },
    {
      title: 'ABC마트',
      address: '서울특별시 마포구 양화로',
      lat: 37.5570,
      lng: 126.9233,
      icon: '👟',
      baseAmount: 67000,
      time: '17:30'
    },
    {
      title: '무신사 스탠다드 홍대',
      address: '서울특별시 마포구 잔다리로',
      lat: 37.5559,
      lng: 126.9218,
      icon: '👕',
      baseAmount: 39000,
      time: '14:10'
    },
    {
      title: '아트박스 홍대점',
      address: '서울특별시 마포구 홍익로',
      lat: 37.5560,
      lng: 126.9225,
      icon: '🎁',
      baseAmount: 12000,
      time: '16:45'
    },
    {
      title: '에이블리 픽업',
      address: '서울특별시 마포구 서교동',
      lat: 37.5548,
      lng: 126.9198,
      icon: '📦',
      baseAmount: 21000,
      time: '18:15'
    }
  ],
  etc: [
    {
      title: '편의점',
      address: '서울특별시 마포구 와우산로',
      lat: 37.5542,
      lng: 126.9237,
      icon: '🏪',
      baseAmount: 4500,
      time: '22:15',
      type: 'expense'
    },
    {
      title: '프리랜서 정산',
      address: '온라인 입금',
      lat: 37.5585,
      lng: 126.9203,
      icon: '₩',
      baseAmount: 180000,
      time: '11:00',
      type: 'income'
    },
    {
      title: 'GS25',
      address: '서울특별시 마포구 서교동',
      lat: 37.5537,
      lng: 126.9184,
      icon: '🏪',
      baseAmount: 2900,
      time: '23:10',
      type: 'expense'
    },
    {
      title: '용돈 입금',
      address: '계좌 입금',
      lat: 37.5563,
      lng: 126.9220,
      icon: '₩',
      baseAmount: 100000,
      time: '20:00',
      type: 'income'
    },
    {
      title: '세탁소',
      address: '서울특별시 마포구 동교동',
      lat: 37.5581,
      lng: 126.9263,
      icon: '🧺',
      baseAmount: 7000,
      time: '19:40',
      type: 'expense'
    },
    {
      title: '문구점',
      address: '서울특별시 마포구 서교동',
      lat: 37.5551,
      lng: 126.9207,
      icon: '✏️',
      baseAmount: 3500,
      time: '12:55',
      type: 'expense'
    }
  ]
}

function formatCurrency(value) {
  return `₩${value.toLocaleString('ko-KR')}`
}

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getCategoryLabel(category) {
  if (category === 'food') return '식비'
  if (category === 'transport') return '교통'
  if (category === 'shopping') return '쇼핑'
  return '기타'
}

function getTypeForCategory(category, place) {
  if (category === 'etc') return place.type ?? 'expense'
  return 'expense'
}

function pickTwoPlaces(list, seed) {
  const firstIndex = seed % list.length
  const secondIndex = (seed + 2) % list.length

  if (firstIndex === secondIndex) {
    return [list[firstIndex], list[(secondIndex + 1) % list.length]]
  }

  return [list[firstIndex], list[secondIndex]]
}

function generateTransactionsUntilToday() {
  const result = []
  let id = 1
  const now = new Date()
  const startDate = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate())
  const endDate = startOfDay(new Date())
  const categoryOrder = ['food', 'transport', 'shopping', 'etc']

  for (
    let cursor = new Date(startDate);
    cursor <= endDate;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    const current = new Date(cursor)
    const year = current.getFullYear()
    const month = current.getMonth()
    const day = current.getDate()
    const dateString = formatDate(current)

    categoryOrder.forEach((category, categoryIndex) => {
      const seed = year + month + day + categoryIndex
      const selectedPlaces = pickTwoPlaces(placePool[category], seed)

      selectedPlaces.forEach((place, placeIndex) => {
        const type = getTypeForCategory(category, place)

        let amountOffset = 0
        if (category === 'food') amountOffset = day * 180 + placeIndex * 350 + month * 40
        else if (category === 'transport') amountOffset = day * 15 + placeIndex * 30 + month * 5
        else if (category === 'shopping') amountOffset = day * 450 + placeIndex * 900 + month * 120
        else if (type === 'income') amountOffset = day * 1200 + placeIndex * 500 + month * 200
        else amountOffset = day * 90 + placeIndex * 140 + month * 20

        const amountValue = place.baseAmount + amountOffset

        const hour = Number(place.time.split(':')[0])
        const minute = Number(place.time.split(':')[1])
        const adjustedMinute = String((minute + day + placeIndex * 7 + month) % 60).padStart(2, '0')
        const adjustedTime = `${String(hour).padStart(2, '0')}:${adjustedMinute}`

        result.push({
          id: id++,
          title: place.title,
          category,
          categoryLabel: getCategoryLabel(category),
          type,
          amount: formatCurrency(amountValue),
          date: dateString,
          time: adjustedTime,
          address: place.address,
          lat: Number((place.lat + day * 0.00012 + placeIndex * 0.00028 + month * 0.00003).toFixed(6)),
          lng: Number((place.lng - day * 0.00010 + placeIndex * 0.00022 - month * 0.00003).toFixed(6)),
          icon: place.icon
        })
      })
    })
  }

  return result
}

function refreshTransactionsForToday() {
  today.value = startOfDay(new Date())
  transactions.value = generateTransactionsUntilToday()

  if (selectedDate.value > today.value) {
    selectedDate.value = new Date(today.value)
    currentMonth.value = new Date(today.value.getFullYear(), today.value.getMonth(), 1)
  }

  renderMarkers()
}

function startDateWatcher() {
  dateCheckTimer = setInterval(() => {
    const now = startOfDay(new Date())
    if (!isSameDate(now, today.value)) {
      refreshTransactionsForToday()
    }
  }, 30000)
}

const formattedSelectedDate = computed(() => {
  const year = selectedDate.value.getFullYear()
  const month = selectedDate.value.getMonth() + 1
  const day = selectedDate.value.getDate()
  return `${year}년 ${month}월 ${day}일`
})

const monthLabel = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.toLocaleString('en-US', { month: 'long' })
  return `${month} ${year}`
})

const filteredTransactions = computed(() => {
  const selected = formatDate(selectedDate.value)

  return transactions.value.filter((item) => {
    const sameDate = item.date === selected
    const sameCategory =
      selectedCategory.value === 'all' || item.category === selectedCategory.value

    return sameDate && sameCategory
  })
})

const calendarDays = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  const startWeekday = firstDay.getDay()
  const totalDays = lastDay.getDate()

  const days = []

  for (let i = 0; i < startWeekday; i += 1) {
    days.push({
      key: `empty-${i}`,
      label: '',
      currentMonth: false,
      date: null,
      isFuture: false
    })
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(year, month, day)
    days.push({
      key: formatDate(date),
      label: day,
      currentMonth: true,
      date,
      isFuture: date > today.value
    })
  }

  return days
})

function isSameDate(a, b) {
  if (!a || !b) return false
  return formatDate(a) === formatDate(b)
}

function selectDate(date) {
  if (!date || date > today.value) return
  selectedDate.value = new Date(date)
  currentMonth.value = new Date(date.getFullYear(), date.getMonth(), 1)
  isCalendarOpen.value = false
}

function moveDate(direction) {
  const next = new Date(selectedDate.value)
  next.setDate(next.getDate() + direction)

  if (next > today.value) {
    selectedDate.value = new Date(today.value)
    currentMonth.value = new Date(today.value.getFullYear(), today.value.getMonth(), 1)
    isCalendarOpen.value = false
    return
  }

  selectedDate.value = next
  currentMonth.value = new Date(next.getFullYear(), next.getMonth(), 1)
  isCalendarOpen.value = false
}

function moveMonth(direction) {
  const nextMonth = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() + direction,
    1
  )

  const todayMonth = new Date(today.value.getFullYear(), today.value.getMonth(), 1)

  if (nextMonth > todayMonth) {
    currentMonth.value = todayMonth
    return
  }

  currentMonth.value = nextMonth
}

function selectCategory(categoryKey) {
  selectedCategory.value = categoryKey
}

function createMarkerImage(category) {
  let fill = '#4474FF'

  if (category === 'food') fill = '#FF6B6B'
  else if (category === 'transport') fill = '#FFAE00'
  else if (category === 'shopping') fill = '#FF8C42'
  else if (category === 'etc') fill = '#4C4C54'

  const svg = `
    <svg width="44" height="56" viewBox="0 0 44 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 55C22 55 40 36.8 40 22C40 10.4 31.6 2 22 2C12.4 2 4 10.4 4 22C4 36.8 22 55 22 55Z" fill="${fill}" stroke="white" stroke-width="2"/>
      <circle cx="22" cy="22" r="10" fill="white"/>
      <circle cx="22" cy="22" r="4" fill="${fill}"/>
    </svg>
  `.trim()

  const encoded = encodeURIComponent(svg)
  return new window.kakao.maps.MarkerImage(
    `data:image/svg+xml;charset=utf-8,${encoded}`,
    new window.kakao.maps.Size(44, 56),
    { offset: new window.kakao.maps.Point(22, 56) }
  )
}

function clearMarkers() {
  markers.value.forEach((marker) => marker.setMap(null))
  markers.value = []
}

function renderMarkers() {
  if (!map.value || !window.kakao || !window.kakao.maps) return

  clearMarkers()

  const items = filteredTransactions.value

  if (items.length === 0) {
    selectedItem.value = null
    return
  }

  const bounds = new window.kakao.maps.LatLngBounds()

  items.forEach((item, index) => {
    const position = new window.kakao.maps.LatLng(item.lat, item.lng)

    const marker = new window.kakao.maps.Marker({
      map: map.value,
      position,
      image: createMarkerImage(item.category)
    })

    window.kakao.maps.event.addListener(marker, 'click', () => {
      selectedItem.value = item
      map.value.panTo(position)
    })

    markers.value.push(marker)
    bounds.extend(position)

    if (index === 0) {
      selectedItem.value = item
    }
  })

  map.value.setBounds(bounds)

  if (items.length === 1) {
    map.value.setLevel(4)
    map.value.panTo(new window.kakao.maps.LatLng(items[0].lat, items[0].lng))
  }
}

function loadKakaoScript() {
  return new Promise((resolve, reject) => {
    if (window.kakao && window.kakao.maps) {
      resolve()
      return
    }

    const existingScript = document.getElementById('kakao-map-sdk')

    if (existingScript) {
      existingScript.addEventListener('load', resolve, { once: true })
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Kakao SDK load error')),
        { once: true }
      )
      return
    }

    const script = document.createElement('script')
    script.id = 'kakao-map-sdk'
    const KAKAO_KEY = import.meta.env.VITE_KAKAO_MAP_KEY

    script.src =
      `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false`
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Kakao SDK load failed'))
    document.head.appendChild(script)
  })
}

async function initMap() {
  await loadKakaoScript()

  window.kakao.maps.load(() => {
    if (!mapRef.value) return

    map.value = new window.kakao.maps.Map(mapRef.value, {
      center: new window.kakao.maps.LatLng(37.5563, 126.922),
      level: 4
    })

    setTimeout(() => {
      if (!map.value) return
      window.kakao.maps.event.trigger(map.value, 'resize')
      map.value.setCenter(new window.kakao.maps.LatLng(37.5563, 126.922))
      renderMarkers()
    }, 300)
  })
}

watch([selectedDate, selectedCategory], () => {
  renderMarkers()
})

onMounted(async () => {
  refreshTransactionsForToday()
  startDateWatcher()
  await nextTick()
  await initMap()
})

onBeforeUnmount(() => {
  if (dateCheckTimer) clearInterval(dateCheckTimer)
})
</script>

<style scoped>
.map-page {
  font-family: Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  width: 100%;
  height: calc(100vh - 88px);
  padding: 24px;
  background: #f3f3f5;
  overflow: hidden;
  box-sizing: border-box;
}

.map-toolbar {
  margin-bottom: 16px;
}

.page-title-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: #111111;
}

.map-board {
  position: relative;
  width: 100%;
  height: calc(100% - 44px);
  border-radius: 17px;
  overflow: hidden;
  border: 1px solid #d9d9df;
  background: #ffffff;
}

.map-area {
  width: 100%;
  height: 100%;
}

.date-pill {
  position: absolute;
  top: 24px;
  left: 24px;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(68, 68, 72, 0.9);
  color: #ffffff;
  border-radius: 17px;
  font-size: 16px;
  font-weight: 600;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
}

.date-arrow {
  width: 24px;
  height: 24px;
  border: 0;
  background: transparent;
  color: #ffffff;
  font-size: 18px;
  cursor: pointer;
}

.calendar-card {
  position: absolute;
  top: 72px;
  left: 24px;
  z-index: 10;
  width: 420px;
  min-width: 320px;
  padding: 12px;
  border-radius: 17px;
  border: 1px solid #d9d9df;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 12px;
  color: #666666;
}

.calendar-nav {
  border: 0;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  color: #111111;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

.calendar-weekdays {
  margin-bottom: 8px;
  font-size: 12px;
  color: #666666;
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
  color: #111111;
}

.calendar-day.selected {
  background: #111111;
  color: #ffffff;
  font-weight: 600;
}

.calendar-day.empty {
  visibility: hidden;
}

.calendar-day.future {
  color: #c3c3c8;
  cursor: not-allowed;
}

.category-stack {
  position: absolute;
  top: 24px;
  right: 24px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-chip {
  min-width: 70px;
  padding: 10px 12px;
  border-radius: 17px;
  border: 1px solid #d9d9df;
  background: rgba(68, 116, 255, 0.88);
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.22s ease;
  opacity: 0.78;
}

.category-chip:nth-child(2) {
  background: rgba(255, 107, 107, 0.92);
}

.category-chip:nth-child(3) {
  background: rgba(255, 174, 0, 0.92);
}

.category-chip:nth-child(4) {
  background: rgba(255, 140, 66, 0.92);
}

.category-chip:nth-child(5) {
  background: rgba(76, 76, 84, 0.92);
}

.category-chip.active {
  opacity: 1;
  transform: translateX(-4px) scale(1.04);
  border-color: rgba(255, 255, 255, 0.95);
  box-shadow:
    0 14px 28px rgba(0, 0, 0, 0.22),
    0 0 0 3px rgba(255, 255, 255, 0.45);
}

.detail-card {
  position: absolute;
  right: 24px;
  bottom: 24px;
  z-index: 10;
  width: 360px;
  border-radius: 17px;
  overflow: hidden;
  border: 1px solid #d9d9df;
  background: #ffffff;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.14);
}

.detail-top {
  padding: 14px 16px;
  background: #55555b;
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
}

.detail-body {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
}

.detail-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-right {
  width: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
}

.detail-date,
.detail-time {
  font-size: 14px;
  font-weight: 400;
  color: #111111;
}

.detail-category {
  font-size: 16px;
  font-weight: 600;
  color: #ff6b6b;
}

.detail-amount {
  font-size: 22px;
  font-weight: 600;
  line-height: 1;
}

.detail-amount.expense {
  color: #ff6b6b;
}

.detail-amount.income {
  color: #2ecc71;
}

.detail-address {
  font-size: 12px;
  color: #666666;
}

.pin-badge {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #fff4f4;
  border: 1px solid #ffd5d5;
  font-size: 24px;
}

@media (max-width: 1200px) {
  .detail-card {
    width: 320px;
  }
}

@media (max-width: 980px) {
  .map-page {
    padding: 16px;
  }

  .calendar-card {
    width: 320px;
  }

  .detail-card {
    left: 16px;
    right: 16px;
    width: auto;
  }
}
</style>