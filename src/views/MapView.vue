<template>
  <section class="map-view">
    <article class="map-card">
      <div class="map-toolbar">
        <div class="page-title-wrap">
          <h1 class="page-title">소비 지도</h1>
        </div>
      </div>

      <div class="map-board" @click="isFilterOpen = false">
        <div class="date-picker-wrap">
          <DatePicker v-model="selectedDateString" :max-date="maxDateString" />
        </div>

        <div class="filter-wrap">
          <button
            class="filter-toggle"
            :class="{ open: isFilterOpen }"
            @click.stop="isFilterOpen = !isFilterOpen"
            aria-label="filter"
          >
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
    </article>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import DatePicker from '@/components/DatePicker.vue';
import { loadKakaoScript } from '@/utils/kakaoMap';
import data2 from '../../data2.json';

const router = useRouter();

const mapRef = ref(null);
const map = ref(null);
const markers = ref([]);
const selectedCategory = ref('all');
const selectedItem = ref(null);
const isFilterOpen = ref(false);
const transactions = ref([]);

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatCurrency(value) {
  return `₩${value.toLocaleString('ko-KR')}`;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateString(value) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getKoreaDateString() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';

  return `${year}-${month}-${day}`;
}

const sourceToday = startOfDay(parseDateString(getKoreaDateString()));
const today = ref(sourceToday);
const selectedDate = ref(sourceToday);

const selectedDateString = computed({
  get() {
    return formatDate(selectedDate.value);
  },
  set(value) {
    const parsed = parseDateString(value);
    if (!parsed) return;
    selectedDate.value = startOfDay(parsed);
  },
});

const maxDateString = computed(() => formatDate(today.value));

const categories = computed(() => {
  return [
    { key: 'all', label: '전체', color: '#4474FF', type: 'all' },
    ...data2.categories.map((category) => ({
      key: category.id,
      label: category.labelKo,
      color: category.color?.startsWith('#')
        ? category.color
        : `#${category.color}`,
      type: category.type,
    })),
  ];
});

function getCategoryInfo(categoryId) {
  return data2.categories.find((category) => category.id === categoryId);
}

function getMarkerIcon(item) {
  if (item.type === 'income') return '₩';
  if (item.categoryId === 'food') return '🍽️';
  if (item.categoryId === 'transport') return '🚌';
  if (item.categoryId === 'shopping') return '🛍️';
  if (item.categoryId === 'medical') return '💊';
  if (item.categoryId === 'subscription') return '💳';
  if (item.categoryId === 'living') return '🏠';
  if (item.categoryId === 'etc') return '📌';
  return '📍';
}

function mapTransactionsFromSource(items) {
  return items.map((item) => {
    const category = getCategoryInfo(item.categoryId);
    const categoryColor = category?.color?.startsWith('#')
      ? category.color
      : `#${category?.color ?? '4474FF'}`;

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
      address: item.place || '',
      lat: item.location?.lat ?? 37.5665,
      lng: item.location?.lng ?? 126.978,
      icon: getMarkerIcon(item),
      memo: item.memo ?? '',
      products: item.products ?? [],
      receiptRef: item.receiptRef ?? null,
    };
  });
}

async function loadLiveTransactions() {
  try {
    const response = await fetch('/api/transactions');

    if (!response.ok) {
      throw new Error(`Failed to load transactions: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : data2.transactions;
  } catch (error) {
    console.warn(
      'Failed to load live transactions for map view. Falling back to bundled data.',
      error,
    );
    return data2.transactions;
  }
}

function resolveInitialSelectedDate(items) {
  const latestDate = [...items]
    .filter((item) => item.date && item.lat && item.lng)
    .sort((left, right) => {
      const dateCompare = String(right.date).localeCompare(String(left.date));

      if (dateCompare !== 0) {
        return dateCompare;
      }

      return String(right.id).localeCompare(String(left.id));
    })[0]?.date;

  const parsed = parseDateString(latestDate);
  return parsed ? startOfDay(parsed) : today.value;
}

async function initializeTransactions() {
  const liveTransactions = await loadLiveTransactions();
  transactions.value = mapTransactionsFromSource(liveTransactions);
  selectedDate.value = resolveInitialSelectedDate(transactions.value);
}

const filteredTransactions = computed(() => {
  const selected = formatDate(selectedDate.value);

  return transactions.value.filter((item) => {
    const sameDate = item.date === selected;
    const sameCategory =
      selectedCategory.value === 'all' ||
      item.category === selectedCategory.value;

    return sameDate && sameCategory;
  });
});

function goToTransactionDetail() {
  if (!selectedItem.value?.id) return;

  router.push({
    path: '/transactions',
    query: {
      selectedId: selectedItem.value.id,
    },
  });
}

function selectCategory(categoryKey) {
  selectedCategory.value = categoryKey;
  isFilterOpen.value = false;
}

function createMarkerImage(categoryKey) {
  const category = categories.value.find((item) => item.key === categoryKey);
  const fill = category?.color ?? '#4474FF';

  const svg = `
    <svg width="44" height="56" viewBox="0 0 44 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 55C22 55 40 36.8 40 22C40 10.4 31.6 2 22 2C12.4 2 4 10.4 4 22C4 36.8 22 55 22 55Z" fill="${fill}" stroke="white" stroke-width="2"/>
      <circle cx="22" cy="22" r="10" fill="white"/>
      <circle cx="22" cy="22" r="4" fill="${fill}"/>
    </svg>
  `.trim();

  const encoded = encodeURIComponent(svg);
  return new window.kakao.maps.MarkerImage(
    `data:image/svg+xml;charset=utf-8,${encoded}`,
    new window.kakao.maps.Size(44, 56),
    { offset: new window.kakao.maps.Point(22, 56) },
  );
}

function clearMarkers() {
  markers.value.forEach((marker) => marker.setMap(null));
  markers.value = [];
}

function getAddressFromCoords(lat, lng) {
  return new Promise((resolve) => {
    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
      resolve('');
      return;
    }

    const geocoder = new window.kakao.maps.services.Geocoder();
    const coord = new window.kakao.maps.LatLng(lat, lng);

    geocoder.coord2Address(coord.getLng(), coord.getLat(), (result, status) => {
      if (
        status === window.kakao.maps.services.Status.OK &&
        result.length > 0
      ) {
        const roadAddress = result[0].road_address?.address_name;
        const jibunAddress = result[0].address?.address_name;
        resolve(roadAddress || jibunAddress || '');
        return;
      }

      resolve('');
    });
  });
}

function renderMarkers() {
  if (!map.value || !window.kakao || !window.kakao.maps) return;

  clearMarkers();

  const items = filteredTransactions.value;

  if (items.length === 0) {
    selectedItem.value = null;
    return;
  }

  const bounds = new window.kakao.maps.LatLngBounds();

  items.forEach((item, index) => {
    const position = new window.kakao.maps.LatLng(item.lat, item.lng);

    const marker = new window.kakao.maps.Marker({
      map: map.value,
      position,
      image: createMarkerImage(item.category),
    });

    window.kakao.maps.event.addListener(marker, 'click', async () => {
      const realAddress = await getAddressFromCoords(item.lat, item.lng);

      selectedItem.value = {
        ...item,
        address: realAddress || item.address || item.title,
      };

      map.value.panTo(position);
    });

    markers.value.push(marker);
    bounds.extend(position);

    if (index === 0) {
      getAddressFromCoords(item.lat, item.lng).then((realAddress) => {
        selectedItem.value = {
          ...item,
          address: realAddress || item.address || item.title,
        };
      });
    }
  });

  map.value.setBounds(bounds);

  if (items.length === 1) {
    map.value.setLevel(4);
    map.value.panTo(new window.kakao.maps.LatLng(items[0].lat, items[0].lng));
  }
}

async function initMap() {
  await loadKakaoScript();

  window.kakao.maps.load(() => {
    if (!mapRef.value) return;

    map.value = new window.kakao.maps.Map(mapRef.value, {
      center: new window.kakao.maps.LatLng(37.5563, 126.922),
      level: 4,
    });

    setTimeout(() => {
      if (!map.value) return;
      window.kakao.maps.event.trigger(map.value, 'resize');
      map.value.setCenter(new window.kakao.maps.LatLng(37.5563, 126.922));
      renderMarkers();
    }, 300);
  });
}

watch([selectedDate, selectedCategory], () => {
  renderMarkers();
});

onMounted(async () => {
  await initializeTransactions();
  await nextTick();
  await initMap();
});
</script>

<style scoped>
.map-view {
  font-family:
    Pretendard,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
}

.map-card {
  width: 100%;
  height: calc(100vh - 160px);
  min-height: 620px;
  padding: 24px;
  border-radius: 17px;
  border: 1px solid #ececf1;
  background: #ffffff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.05);
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}

.map-toolbar {
  flex-shrink: 0;
}

.page-title-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  margin: 0;
  font-size: 30px;
  line-height: 1.2;
  font-weight: 800;
  color: #111827;
}

.map-board {
  position: relative;
  width: 100%;
  flex: 1;
  min-height: 0;
  border-radius: 15px;
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
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
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

.detail-date {
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
  .map-card {
    padding: 16px;
    height: calc(100vh - 144px);
    min-height: 540px;
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
