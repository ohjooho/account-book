<template>
  <div class="transaction-form-page">
    <h1 class="page-title">거래 작성</h1>

    <div class="form-container">
      <!-- 분류 (수입/지출 토글) -->
      <div class="form-row">
        <label class="form-label">분류</label>
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
        <label class="form-label">날짜</label>
        <input type="date" class="form-input" v-model="form.date" />
      </div>

      <!-- 금액 -->
      <div class="form-row">
        <label class="form-label">금액</label>
        <input
          type="number"
          class="form-input"
          placeholder="입력하세요"
          v-model="form.price"
        />
      </div>

      <!-- 지출일 때만 보이는 필드들 -->
      <template v-if="form.type === 'expense'">
        <!-- 카테고리 -->
        <div class="form-row">
          <label class="form-label">카테고리</label>
          <select class="form-input" v-model="form.categoryId">
            <option value="">선택하세요</option>
            <option
              v-for="category in expenseCategories"
              :key="category.id"
              :value="category.id"
            >
              {{ category.labelKo }}
            </option>
          </select>
        </div>

        <!-- 장소 -->
        <div class="form-row">
          <label class="form-label">장소</label>
          <input
            type="text"
            class="form-input"
            placeholder="입력하세요"
            v-model="form.place"
          />
        </div>

        <!-- 품목 -->
        <div class="form-row">
          <label class="form-label">품목</label>
          <input
            type="text"
            class="form-input"
            placeholder="입력하세요 (쉼표로 구분)"
            v-model="form.products"
          />
        </div>
      </template>

      <!-- 메모 -->
      <div class="form-row">
        <label class="form-label">메모</label>
        <input
          type="text"
          class="form-input"
          placeholder="입력하세요"
          v-model="form.memo"
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
});

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
  // 유효성 검사

  // 날짜 필수
  if (!form.value.date) {
    alert('날짜를 입력해주세요.');
    return;
  }

  // 금액 필수
  if (!form.value.price) {
    alert('금액을 입력해주세요.');
    return;
  }

  // 지출일 때는 카테고리도 필수
  if (form.value.type === 'expense' && !form.value.categoryId) {
    alert('카테고리를 선택해주세요.');
    return;
  }

  // 지출일 때는 장소도 필수
  if (form.value.type === 'expense' && !form.value.place) {
    alert('장소를 입력해주세요.');
    return;
  }

  // 지출일 때는 품목도 필수
  if (form.value.type === 'expense' && !form.value.products) {
    alert('품목을 입력해주세요.');
    return;
  }

  // ===== 데이터 가공 =====
  const newTransaction = {
    type: form.value.type,
    date: form.value.date,
    price: Number(form.value.price),
    categoryId: form.value.type === 'income' ? 'income' : form.value.categoryId,
    memo: form.value.memo,
    place: form.value.place,
    // 수입일 때 저장 안되게 할 경우
    // place: form.value.type === 'income' ? '' : form.value.place,
    products: form.value.products
      ? form.value.products.split(',').map((p) => p.trim())
      : [],
    // 수입일 때 저장 안되게 할 경우
    // products:
    //   form.value.type === 'income'
    //     ? []
    //     : form.value.products
    //       ? form.value.products.split(',').map((p) => p.trim())
    //       : [],
    location: null,
    receiptRef: '',
  };

  // ===== 저장 및 목록 페이지로 이동 =====
  try {
    await transactionsStore.addTransactions(newTransaction);
    alert('거래가 성공적으로 저장되었습니다.');
    router.push('/transactions');
  } catch (e) {
    alert('저장에 실패했습니다. 다시 시도해주세요.');
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

/* 숫자 입력 필드 스피너 숨기기 */
/* Chrome, Edge */
.form-input[type='number']::-webkit-outer-spin-button,
.form-input[type='number']::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
/* Firefox */
.form-input[type='number'] {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>
