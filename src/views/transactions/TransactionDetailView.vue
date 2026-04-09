<template>
  <div class="transaction-detail-page">
    <h1 class="page-title">거래 상세</h1>

    <div class="form-container">
      <!-- 영수증 (있을 때만) -->
      <div v-if="receipt" class="form-row receipt-row">
        <label class="form-label">영수증</label>
        <div class="receipt-content">
          <img
            src="@/penguin.jpg"
            :src="receipt.imageUrl"
            :alt="`영수증 ${receipt.id}`"
            class="receipt-image"
          />
          <!-- // 스캔된 내용 표시 -->
          <!-- <div v-if="receipt.ocrRawText" class="receipt-ocr">
            <div class="receipt-ocr-title">스캔된 내용</div>
            <pre class="receipt-ocr-text">{{ receipt.ocrRawText }}</pre>
          </div> -->
        </div>
      </div>

      <!-- 분류 (읽기 전용) -->
      <div class="form-row">
        <label class="form-label">분류</label>
        <div class="form-value" :class="form.type">
          {{ form.type === 'income' ? '수입' : '지출' }}
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
        <button type="button" class="btn btn-delete" @click="handleDelete">
          삭제
        </button>
        <button type="button" class="btn btn-update" @click="handleUpdate">
          수정
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTransactionsStore } from '@/stores/transactions';
import { useCategoryStore } from '@/stores/category';
import axios from 'axios';

// ===== Store 연결 =====
const transactionsStore = useTransactionsStore();
const categoryStore = useCategoryStore();

// ===== 라우터 =====
const route = useRoute();
const router = useRouter();

// ===== 폼 데이터 (빈 값으로 초기화) =====
const form = ref({
  type: 'income',
  date: '',
  price: '',
  categoryId: '',
  place: '',
  products: '',
  memo: '',
});

// ===== 영수증 데이터 =====
const receipt = ref(null);

// ===== 지출 카테고리만 필터링 =====
const expenseCategories = computed(() => {
  return categoryStore.categories.filter((c) => c.type === 'expense');
});

// ===== 페이지 마운트 시 =====
onMounted(async () => {
  // 카테고리 불러오기
  await categoryStore.fetchCategories();

  // URL의 id로 거래 정보 불러오기
  const transactionId = route.params.id;
  const transaction =
    await transactionsStore.fetchTransactionById(transactionId);

  if (!transaction) {
    alert('거래 정보를 찾을 수 없습니다.');
    router.push('/transactions');
    return;
  }

  // 폼에 기존 데이터 채우기
  form.value = {
    type: transaction.type,
    date: transaction.date,
    price: transaction.price,
    categoryId: transaction.categoryId,
    place: transaction.place || '',
    products: Array.isArray(transaction.products)
      ? transaction.products.join(', ')
      : '',
    memo: transaction.memo || '',
  };

  // ===== 영수증 불러오기 (receiptId가 있을 때만) =====
  if (transaction.receiptId) {
    try {
      const response = await axios.get(
        `/api/receipts/${transaction.receiptId}`,
      );
      receipt.value = response.data;
    } catch (e) {
      console.error('영수증 조회 실패:', e);
    }
  }
});

// ===== 이벤트 핸들러 =====

// 수입/지출 토글
const setType = (type) => {
  form.value.type = type;
};

// 목록으로 돌아가기
const goBack = () => {
  router.push('/transactions');
};

// 수정
const handleUpdate = () => {
  console.log('수정할 데이터:', form.value);
};

// 삭제 버튼
const handleDelete = async () => {
  // 삭제 확인
  if (!confirm('정말 이 거래를 삭제하시겠습니까?')) {
    return;
  }

  // 삭제 실행
  try {
    await transactionsStore.deleteTransactions(route.params.id);
    alert('거래가 성공적으로 삭제되었습니다.');
    router.push('/transactions');
  } catch (e) {
    alert('삭제에 실패했습니다. 다시 시도해주세요.');
    console.error('삭제 에러:', e);
  }
};
</script>

<style scoped>
/* ===== 페이지 전체 ===== */
.transaction-detail-page {
  padding: 24px;
  padding-bottom: 120px; /* 고정 버튼에 가려지지 않도록 */
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
  position: relative;
  background-color: #ffffff;
  padding: 32px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  padding-bottom: 40px;
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
/* 분류 (읽기 전용) */
.form-value {
  flex: 1;
  padding: 10px 14px;
  font-size: 15px;
  color: #333;
  font-weight: 500;
}

.form-value.income {
  color: #4f8f86; /* 초록 */
  font-weight: 600;
}

.form-value.expense {
  color: #d46a7e; /* 빨강 */
  font-weight: 600;
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
  border-color: #4a6fa5;
}

/* ===== 숫자 입력 스피너 숨기기 ===== */
.form-input[type='number']::-webkit-outer-spin-button,
.form-input[type='number']::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.form-input[type='number'] {
  -moz-appearance: textfield;
  appearance: textfield;
}

/* ===== 수입/지출 토글 버튼 ===== */
/* .type-toggle {
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
} */

/* ===== 버튼 영역 ===== */
.button-area {
  position: sticky;
  bottom: 0;
  left: 0;
  width: 100%;

  background-color: #ffffff;
  padding: 20px 0;
  margin-top: 40px;

  display: flex;
  gap: 12px;
  z-index: 1000;
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

.btn-delete {
  background-color: #4a4a4a;
  color: #ffffff;
}

.btn-delete:hover {
  background-color: #4a4a4a;
}

.btn-update {
  background-color: #5d6d97;
  color: #ffffff;
}

.btn-update:hover {
  background-color: #5d6d97;
}

/* ===== 영수증 영역 ===== */
.receipt-row {
  align-items: flex-start; /* 위쪽 정렬 (이미지가 크니까) */
}

.receipt-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.receipt-image {
  max-width: 100%;
  max-height: 400px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  object-fit: contain;
}

.receipt-ocr {
  background-color: #f9f9f9;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.receipt-ocr-title {
  font-size: 13px;
  font-weight: 600;
  color: #666;
  margin-bottom: 8px;
}

.receipt-ocr-text {
  font-size: 14px;
  color: #333;
  white-space: pre-wrap; /* 줄바꿈 유지 */
  margin: 0;
  font-family: inherit; /* 기본 폰트 사용 */
}
</style>
