<template>
  <div class="transaction-form-page">
    <h1 class="page-title">거래 작성</h1>

    <div class="form-container">
      <!-- 분류 (수입/지출 토글) -->
      <div class="form-row">
        <label class="form-label">
          분류
          <span style="color: red">*</span>
        </label>
        <div class="type-toggle">
          <button
            type="button"
            class="toggle-btn"
            :class="{ active: form.type === 'income' }"
            @click="setType('income')"
          >
            수입
          </button>
          <button
            type="button"
            class="toggle-btn"
            :class="{ active: form.type === 'expense' }"
            @click="setType('expense')"
          >
            지출
          </button>
        </div>
      </div>

      <!-- 날짜 -->
      <div class="form-row">
        <label class="form-label">
          날짜
          <span style="color: red">*</span>
        </label>
        <DatePicker
          v-model="form.date"
          :max-date="todayString"
          ref="dateInputRef"
          :class="{ 'input-error': invalidField === 'date' }"
          @input="handleInput('date')"
        />
      </div>

      <!-- 금액 -->
      <div class="form-row">
        <label class="form-label"
          >금액
          <span style="color: red">*</span>
        </label>
        <input
          type="text"
          inputmode="numeric"
          v-model="form.price"
          ref="priceInputRef"
          placeholder="입력하세요"
          class="form-input"
          :class="{ 'input-error': invalidField === 'price' }"
          @input="handleInput('price')"
        />
      </div>
      <!-- 지출일 때만 보이는 필드 -->
      <template v-if="form.type === 'expense'">
        <!-- 카테고리 -->
        <div class="form-row">
          <label class="form-label"
            >카테고리
            <span style="color: red">*</span>
          </label>
          <select
            v-model="form.categoryId"
            ref="categorySelectRef"
            class="form-input"
            :class="{ 'input-error': invalidField === 'category' }"
            @input="handleInput('category')"
          >
            <option value="" disabled selected>선택하세요</option>
            <option
              v-for="category in expenseCategories"
              :key="category.id"
              :value="category.id"
            >
              {{ category.labelKo }}
            </option>
          </select>
        </div>
      </template>

      <!-- 장소 -->
      <div class="form-row">
        <label class="form-label"
          >장소
          <span style="color: red">*</span>
        </label>
        <input
          type="text"
          v-model.trim="form.place"
          ref="placeInputRef"
          placeholder="입력하세요"
          class="form-input"
          :class="{ 'input-error': invalidField === 'place' }"
          @input="handleInput('place')"
        />
      </div>

      <!-- 품목 -->
      <div class="form-row">
        <label class="form-label"
          >품목
          <span style="color: red">*</span>
        </label>
        <input
          type="text"
          v-model="form.products"
          ref="productsInputRef"
          placeholder="쉼표(,)로 구분해서 입력하세요"
          class="form-input"
          :class="{ 'input-error': invalidField === 'products' }"
          @input="handleInput('products')"
        />
      </div>

      <!-- 메모 -->
      <div class="form-row">
        <label class="form-label">메모</label>
        <input
          type="text"
          class="form-input"
          placeholder="입력하세요"
          v-model="form.memo"
          @input="handleInput('memo')"
        />
      </div>

      <!-- 버튼 영역 -->
      <div class="button-area">
        <button type="button" class="btn btn-cancel" @click="goBack">
          취소
        </button>
        <button type="button" class="btn btn-save" @click="handleSave">
          저장
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useTransactionsStore } from '@/stores/transactions';
import { useCategoryStore } from '@/stores/category';
import { getLocationByPlace } from '@/utils/kakaoMap';
import DatePicker from '@/components/DatePicker.vue';

// ===== Store 연결 =====
const transactionsStore = useTransactionsStore();
const categoryStore = useCategoryStore();

// ===== 라우터 =====
const router = useRouter();

// ===== 폼 데이터 =====
const form = ref({
  type: 'income', // 'income' 또는 'expense'
  date: '', // 'YYYY-MM-DD' 형식
  price: '', // 금액
  categoryId: '', // 카테고리 id
  place: '', // 장소
  products: '', // 품목 (일단 문자열로 받고, 나중에 배열로 변환)
  memo: '', // 메모
  location: {},
  receiptRef: '',
});

// 오늘 날짜를 'YYYY-MM-DD' 형식으로 계산 (미래 날짜 선택 방지용)
const todayString = computed(() => {
  const t = new Date();
  const year = t.getFullYear();
  const month = t.getMonth() + 1;
  const day = t.getDate();

  // 10보다 작으면 '0'을 붙이고, 아니면 그대로 유지
  const m = month < 10 ? '0' + month : month;
  const d = day < 10 ? '0' + day : day;

  return `${year}-${m}-${d}`;
});

// ===== 에러 상태 관리 변수 추가 =====
const formErrorMessage = ref('');
const invalidField = ref('');

// ===== 각 필드 참조(Ref) 추가 (포커스용) =====
const dateInputRef = ref(null);
const priceInputRef = ref(null);
const categorySelectRef = ref(null);
const placeInputRef = ref(null);
const productsInputRef = ref(null);

// 포커스 함수
const setInvalidField = (fieldName, el) => {
  invalidField.value = fieldName;
  if (el) {
    el.focus();
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
};

// 유효성 검사 함수 분리
const validateForm = () => {
  // 1. 날짜 체크
  if (!form.value.date) {
    formErrorMessage.value = '날짜를 입력해주세요.';
    setInvalidField('date', dateInputRef.value);
    return false;
  }

  // 2. 금액 체크
  if (!form.value.price || Number(form.value.price) <= 0) {
    formErrorMessage.value = '금액을 입력해주세요.';
    setInvalidField('price', priceInputRef.value);
    return false;
  }

  // 3. 지출 시 카테고리 체크
  if (form.value.type === 'expense' && !form.value.categoryId) {
    formErrorMessage.value = '카테고리를 선택해주세요.';
    setInvalidField('category', categorySelectRef.value);
    return false;
  }

  // 4. 장소 체크
  if (!form.value.place?.trim()) {
    formErrorMessage.value = '장소를 입력해주세요.';
    setInvalidField('place', placeInputRef.value);
    return false;
  }

  // 5. 품목 체크
  if (!form.value.products?.trim()) {
    formErrorMessage.value = '품목을 입력해주세요.';
    setInvalidField('products', productsInputRef.value);
    return false;
  }

  // 모두 통과 시 초기화
  formErrorMessage.value = '';
  invalidField.value = '';
  return true;
};

// 에러 초기화 및 데이터 가공을 위한 통합 핸들러
const handleInput = (fieldName) => {
  // 1. 에러 상태 초기화 (입력 시작하면 빨간 테두리 해제)
  if (invalidField.value === fieldName) {
    invalidField.value = '';
    formErrorMessage.value = '';
  }

  // 2. 금액 필드일 경우 숫자만 남기기
  if (fieldName === 'price') {
    // 숫자가 아닌 모든 문자를 제거
    const onlyNumbers = String(form.value.price).replace(/[^0-9]/g, '');
    // 가공된 값을 다시 form에 할당
    form.value.price = onlyNumbers;
  }
};

// ===== 카테고리 불러오기 =====
categoryStore.fetchCategories();

// ===== 지출 카테고리 필터링 =====
const expenseCategories = computed(() => {
  return categoryStore.categories.filter((c) => c.type === 'expense');
});

// ===== 이벤트 핸들러 =====

// 수입/지출 토글
const setType = (type) => {
  form.value.type = type;
};

// 취소 버튼
const goBack = () => {
  router.push('/transactions');
};

// 저장 버튼
const handleSave = async () => {
  // 유효성 검사 함수
  if (!validateForm()) return;

  // ===== 데이터 가공 =====
  const newTransaction = {
    type: form.value.type,
    date: form.value.date,
    price: Number(form.value.price),
    categoryId: form.value.type === 'income' ? 'income' : form.value.categoryId,
    memo: form.value.memo,
    place: form.value.place,
    products: form.value.products
      ? form.value.products.split(',').map((p) => p.trim())
      : [],
    location: await getLocationByPlace(form.value.place),
    receiptRef: form.value.receiptRef,
  };

  // ===== 저장 및 목록 페이지로 이동 =====
  try {
    await transactionsStore.addTransactions(newTransaction);
    alert('거래가 성공적으로 저장되었습니다.');
    router.push('/transactions');
  } catch (e) {
    formErrorMessage.value = '저장에 실패했습니다. 다시 시도해주세요.';
    console.error('저장 에러:', e);
  }
};
</script>

<style scoped>
/* ===== 페이지 전체 ===== */
.transaction-form-page {
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
}

.page-title {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 32px;
}

/* ===== 폼 컨테이너 ===== */
.form-container {
  background-color: #ffffff;
  padding: 32px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

/* ===== 폼 행 ===== */
.form-row {
  display: flex;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.form-row:last-child {
  border-bottom: none;
}

.form-label {
  width: 120px;
  font-size: 16px;
  font-weight: 500;
  color: #333;
  flex-shrink: 0;

  display: flex;
  align-items: center;
  gap: 2px;
}

/* ===== 입력 필드 ===== */
.form-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: #5d6d97;
}

/* ===== 수입/지출 토글 버튼 ===== */
.type-toggle {
  display: flex;
  gap: 12px;
}

.toggle-btn {
  padding: 10px 32px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background-color: #ffffff;
  font-size: 15px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-btn:hover {
  background-color: #f5f5f5;
}

.toggle-btn.active {
  background-color: #5d6d97;
  color: #ffffff;
  border-color: #5d6d97;
}

/* ===== 버튼 영역 ===== */
.button-area {
  display: flex;
  gap: 12px;
  margin-top: 32px;
}

.btn {
  flex: 1;
  padding: 14px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background-color: #f0f0f0;
  color: #666;
}

.btn-cancel:hover {
  background-color: #e0e0e0;
}

.btn-save {
  background-color: #5d6d97;
  color: #ffffff;
}

.btn-save:hover {
  background-color: #5d6d97;
}

/* 에러 메시지 */
.form-error-message {
  margin: 10px 0;
  color: #d9534f;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
}

.input-error {
  border: 1.5px solid #d9534f !important;
  background-color: #fff8f8; /* 살짝 붉은 배경을 주면 더 눈에 띕니다 */
}

/* 포커스 됐을 때도 빨간 테두리 유지 */
.input-error:focus {
  outline: none;
  border-color: #d9534f !important;
  box-shadow: 0 0 0 2px rgba(217, 83, 79, 0.2);
}
</style>
