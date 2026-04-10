<template>
  <div class="map-page">
    <div class="map-toolbar">
      <div class="page-title-wrap">
        <h1 class="page-title">소비 지도</h1>
      </div>
    </div>

    <div class="map-board" @click="isFilterOpen = false">
      <div class="date-picker-wrap">
        <DatePicker
          v-model="selectedDateString"
          :max-date="maxDateString"
        />
      </div>

      <div class="filter-wrap">
        <button class="filter-toggle" @click.stop="isFilterOpen = !isFilterOpen" aria-label="filter">
          <svg
            class="filter-icon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M7 10L12 15L17 10"
              stroke="currentColor"
              stroke-width="2.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        <div v-if="isFilterOpen" class="category-stack" @click.stop>
          <button
            v-for="category in categories"
            :key="category.key"
            class="category-chip"
            :class="{ active: selectedCategory === category.key }"
            :style="{ background: category.color }"
            @click="selectCategory(category.key)"
          >
            {{ category.label }}
          </button>
        </div>
      </div>

      <div ref="mapRef" class="map-area"></div>

      <div
        v-if="selectedItem"
        class="detail-card clickable"
        @click="goToTransactionDetail"
      >
        <div class="detail-top">{{ selectedItem.title }}</div>

        <div class="detail-body">
          <div class="detail-left">
            <div class="detail-date">{{ selectedItem.date }}</div>
            <div class="detail-time">{{ selectedItem.time }}</div>
            <div
              class="detail-category"
              :style="{ color: selectedItem.categoryColor }"
            >
              {{ selectedItem.categoryLabel }}
            </div>
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
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import DatePicker from '@/components/DatePicker.vue'
import data2 from '../../data2.json'

const router = useRouter()

const mapRef = ref(null)
const map = ref(null)
const markers = ref([])
const selectedCategory = ref('all')
const selectedItem = ref(null)
const isFilterOpen = ref(false)
const transactions = ref([])

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
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

function parseDateString(value) {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const sourceToday = startOfDay(new Date(data2.meta.currentDate))
const today = ref(sourceToday)
const selectedDate = ref(sourceToday)

const selectedDateString = computed({
  get() {
    return formatDate(selectedDate.value)
  },
  set(value) {
    const parsed = parseDateString(value)
    if (!parsed) return
    selectedDate.value = startOfDay(parsed)
  }
})

const maxDateString = computed(() => formatDate(today.value))

const categories = computed(() => {
  return [
    { key: 'all', label: '전체', color: '#4474FF', type: 'all' },
    ...data2.categories.map((category) => ({
      key: category.id,
      label: category.labelKo,
      color: category.color?.startsWith('#') ? category.color : `#${category.color}`,
      type: category.type
    }))
  ]
})

function getCategoryInfo(categoryId) {
  return data2.categories.find((category) => category.id === categoryId)
}

function formatTimeFromId(id) {
  const str = String(id)
  const tail = str.slice(-4)
  const hour = Number(tail.slice(0, 2)) % 24
  const minute = Number(tail.slice(2, 4)) % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function getMarkerIcon(item) {
  if (item.type === 'income') return '₩'
  if (item.categoryId === 'food') return '🍽️'
  if (item.categoryId === 'transport') return '🚌'
  if (item.categoryId === 'shopping') return '🛍️'
  if (item.categoryId === 'medical') return '💊'
  if (item.categoryId === 'subscription') return '💳'
  if (item.categoryId === 'living') return '🏠'
  if (item.categoryId === 'etc') return '📌'
  return '📍'
}

function mapTransactionsFromData2() {
  return data2.transactions.map((item) => {
    const category = getCategoryInfo(item.categoryId)
    const categoryColor = category?.color?.startsWith('#')
      ? category.color
      : `#${category?.color ?? '4474FF'}`

    return {
      id: item.id,
      title: item.place || item.memo || '거래 내역',
      category: item.categoryId,
      categoryLabel: category?.labelKo ?? item.categoryId,
      categoryColor,
      type: item.type,
      amount: formatCurrency(item.price),
      amountValue: item.price,
      date: item.date,
      time: formatTimeFromId(item.id),
      address: item.place || '',
      lat: item.location?.lat ?? 37.5665,
      lng: item.location?.lng ?? 126.978,
      icon: getMarkerIcon(item),
      memo: item.memo ?? '',
      products: item.products ?? [],
      receiptId: item.receiptId ?? null
    }
  })
}

function initializeTransactions() {
  transactions.value = mapTransactionsFromData2()
}

const filteredTransactions = computed(() => {
  const selected = formatDate(selectedDate.value)

  return transactions.value.filter((item) => {
    const sameDate = item.date === selected
    const sameCategory =
      selectedCategory.value === 'all' || item.category === selectedCategory.value

    return sameDate && sameCategory
  })
})

function goToTransactionDetail() {
  if (!selectedItem.value?.id) return

  router.push({
    path: '/transactions',
    query: {
      selectedId: selectedItem.value.id
    }
  })
}

function selectCategory(categoryKey) {
  selectedCategory.value = categoryKey
  isFilterOpen.value = false
}

function createMarkerImage(categoryKey) {
  const category = categories.value.find((item) => item.key === categoryKey)
  const fill = category?.color ?? '#4474FF'

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

function getAddressFromCoords(lat, lng) {
  return new Promise((resolve) => {
    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
      resolve('')
      return
    }

    const geocoder = new window.kakao.maps.services.Geocoder()
    const coord = new window.kakao.maps.LatLng(lat, lng)

    geocoder.coord2Address(coord.getLng(), coord.getLat(), (result, status) => {
      if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
        const roadAddress = result[0].road_address?.address_name
        const jibunAddress = result[0].address?.address_name
        resolve(roadAddress || jibunAddress || '')
        return
      }

      resolve('')
    })
  })
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

    window.kakao.maps.event.addListener(marker, 'click', async () => {
      const realAddress = await getAddressFromCoords(item.lat, item.lng)

      selectedItem.value = {
        ...item,
        address: realAddress || item.address || item.title
      }

      map.value.panTo(position)
    })

    markers.value.push(marker)
    bounds.extend(position)

    if (index === 0) {
      getAddressFromCoords(item.lat, item.lng).then((realAddress) => {
        selectedItem.value = {
          ...item,
          address: realAddress || item.address || item.title
        }
      })
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
      `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false&libraries=services`
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
  initializeTransactions()
  await nextTick()
  await initMap()
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

.date-picker-wrap {
  position: absolute;
  top: 24px;
  left: 24px;
  z-index: 10;
  width: 220px;
}

:deep(.date-picker) {
  width: 100%;
}

:deep(.date-pill) {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  width: 100%;
  padding: 0 14px;
  background: rgba(68, 68, 72, 0.9);
  color: #ffffff;
  border-radius: 17px;
  border: none;
  font-size: 16px;
  font-weight: 600;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
  box-sizing: border-box;
}

:deep(.date-arrow) {
  width: 24px;
  height: 24px;
  border: 0;
  background: transparent;
  color: #ffffff;
  font-size: 18px;
  cursor: pointer;
}

:deep(.calendar-card) {
  position: absolute;
  top: 52px;
  left: 0;
  z-index: 20;
  width: 420px;
  min-width: 320px;
  padding: 12px;
  border-radius: 17px;
  border: 1px solid #d9d9df;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
  box-sizing: border-box;
}

:deep(.calendar-header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 12px;
  color: #666666;
}

:deep(.calendar-nav) {
  border: 0;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  color: #111111;
}

:deep(.calendar-title) {
  border: none;
  background: transparent;
  box-shadow: none;
  outline: none;
  cursor: pointer;
  font-size: 16px;
  color: #111111;
  font-weight: 600;
  padding: 4px 8px;
}

:deep(.calendar-grid) {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

:deep(.calendar-weekdays) {
  margin-bottom: 8px;
  font-size: 12px;
  color: #666666;
  text-align: center;
}

:deep(.calendar-days) {
  font-size: 14px;
}

:deep(.calendar-day) {
  width: 100%;
  aspect-ratio: 1 / 1;
  border: 0;
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  color: #111111;
}

:deep(.calendar-day.selected) {
  background: #111111;
  color: #ffffff;
  font-weight: 600;
}

:deep(.calendar-day.empty) {
  visibility: hidden;
}

:deep(.calendar-day.future) {
  color: #c3c3c8;
  cursor: not-allowed;
}

:deep(.year-grid) {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 12px 4px 4px;
}

:deep(.year-button) {
  height: 48px;
  border: 1px solid #d9d9df;
  border-radius: 10px;
  background: #fff;
  color: #222;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

:deep(.year-button.selected) {
  background: #222;
  color: #fff;
}

.filter-wrap {
  position: absolute;
  top: 24px;
  right: 24px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.filter-toggle {
  width: 44px;
  height: 44px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 17px;
  background: rgba(68, 68, 72, 0.9);
  color: #ffffff;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
  transition: 0.2s ease;
  backdrop-filter: blur(8px);
  box-sizing: border-box;
}

.filter-toggle:hover {
  transform: translateY(-1px) scale(1.02);
}

.filter-toggle:active {
  transform: scale(0.97);
}

.filter-icon {
  width: 18px;
  height: 18px;
  transition: transform 0.2s ease;
}

.filter-toggle.open .filter-icon {
  transform: rotate(180deg);
}

.category-stack {
  display: grid;
  grid-template-columns: repeat(2, minmax(76px, 1fr));
  gap: 8px;
  margin-top: 2px;
  width: 168px;
}

.category-chip {
  width: 100%;
  min-width: 0;
  padding: 10px 12px;
  border-radius: 17px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.22s ease;
  opacity: 0.82;
  text-align: center;
}

.category-chip:last-child {
  grid-column: 1 / -1;
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
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.detail-card.clickable {
  cursor: pointer;
}

.detail-card.clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.18);
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

  :deep(.calendar-card) {
    width: 320px;
  }

  .detail-card {
    left: 16px;
    right: 16px;
    width: auto;
    transform: none;
  }
}
</style>