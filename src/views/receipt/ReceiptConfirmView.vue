<template>
  <div class="receipt-detail-page" v-if="receiptDraft">
    <div class="receipt-layout">
      <div class="receipt-image-panel">
        <img
          :src="`http://localhost:3001${receiptDraft.imageUrl}`"
          alt="영수증 이미지"
          class="receipt-image"
        />
      </div>

      <div class="receipt-form-panel">
        <div class="form-group">
          <label>날짜 <span style="color: red">*</span></label>
          <DatePicker
            v-model="receiptDraft.aiResult.date"
            :max-date="todayString"
          />
        </div>

        <div class="form-group">
          <label>금액 <span style="color: red">*</span></label>
          <input
            ref="priceInputRef"
            :value="priceInput"
            type="text"
            inputmode="numeric"
            placeholder="숫자만 입력해주세요."
            :class="{ 'input-error': invalidField === 'price' }"
            @input="handlePriceInput"
          />
        </div>

        <div class="form-group">
          <label>카테고리 <span style="color: red">*</span></label>
          <select v-model="receiptDraft.aiResult.categoryId" type="text">
            <option
              v-for="category in expenseCategories"
              :key="category.id"
              :value="category.id"
            >
              {{ category.labelKo }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>장소 <span style="color: red">*</span></label>
          <input
            ref="placeInputRef"
            v-model.trim="receiptDraft.aiResult.place"
            type="text"
            :class="{ 'input-error': invalidField === 'place' }"
            placeholder="ex) 씨유 세종대후문점"
          />
        </div>

        <div class="form-group">
          <label>품목 <span style="color: red">*</span></label>
          <input
            ref="productsInputRef"
            :value="productsText"
            type="text"
            :class="{ 'input-error': invalidField === 'products' }"
            placeholder="쉼표(,)로 구분해서 입력해주세요."
            @input="handleProductsInput"
          />
        </div>

        <div class="form-group">
          <label>메모</label>
          <input
            ref="memoInputRef"
            v-model="receiptDraft.aiResult.memo"
            placeholder="구매 내용을 입력해주세요."
            type="text"
          />
        </div>

        <p v-if="formErrorMessage" class="form-error-message">
          {{ formErrorMessage }}
        </p>
        <div class="button-group">
          <button class="cancel-button" @click="goBack">취소</button>
          <button
            class="submit-button"
            :disabled="isSaving"
            @click="receiptSave"
          >
            {{ isSaving ? '등록 중...' : '등록' }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="loading-box">불러오는 중...</div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import DatePicker from '@/components/DatePicker.vue';
import { getLocationByPlace } from '@/utils/kakaoMap';
import { useReceiptStore } from '@/stores/receipt';
import { useTransactionsStore } from '@/stores/transactions';
import { useCategoryStore } from '@/stores/category';

const router = useRouter();

const priceInputRef = ref(null);
const categorySelectRef = ref(null);
const placeInputRef = ref(null);
const productsInputRef = ref(null);
const memoInputRef = ref(null);

const receiptStore = useReceiptStore();
const transactionsStore = useTransactionsStore();
const categoryStore = useCategoryStore();

const receiptDraft = ref(null);
const isSaving = ref(false);
const formErrorMessage = ref('');
const invalidField = ref('');

//날짜
const todayString = computed(() => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
});
//카테고리
categoryStore.fetchCategories();

const expenseCategories = computed(() => {
  return categoryStore.categories.filter((c) => c.type === 'expense');
});
// 상품목록
const productsText = computed(() => {
  if (!receiptDraft.value) return '';
  return receiptDraft.value.aiResult.products.join(', ');
});
// 가격
const priceInput = computed(() => {
  if (!receiptDraft.value) return '';
  const value = receiptDraft.value.aiResult.price;
  return value === null || value === undefined ? '' : String(value);
});
const normalizedProducts = computed(() => {
  if (!receiptDraft.value) return [];
  return receiptDraft.value.aiResult.products
    .map((i) => i.trim())
    .filter(Boolean);
});
const setInvalidField = (fieldName, el) => {
  invalidField.value = fieldName;
  focusField(el);
};

const clearFieldError = (fieldName) => {
  if (invalidField.value === fieldName) {
    invalidField.value = '';
    formErrorMessage.value = '';
  }
};

//저장 버튼 클릭시 유효성 검사하기
const focusField = (el) => {
  if (!el) return;
  el.focus();
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

const validateFormAndFocus = () => {
  const ai = receiptDraft.value?.aiResult;
  if (!ai) return false;

  if (!ai.date) {
    formErrorMessage.value = '날짜를 입력해주세요.';
    invalidField.value = 'date';
    return false;
  }

  if (String(ai.price).trim() === '' || Number(ai.price) <= 0) {
    formErrorMessage.value = '금액을 입력해주세요.';
    setInvalidField('price', priceInputRef.value);
    return false;
  }

  if (!ai.categoryId?.trim()) {
    formErrorMessage.value = '카테고리를 선택해주세요.';
    return false;
  }

  if (!ai.place?.trim()) {
    formErrorMessage.value = '장소를 입력해주세요.';
    setInvalidField('place', placeInputRef.value);
    return false;
  }

  if (normalizedProducts.value.length === 0) {
    formErrorMessage.value = '품목을 입력해주세요.';
    setInvalidField('products', productsInputRef.value);
    return false;
  }

  if (!ai.memo?.trim()) {
    formErrorMessage.value = '메모를 입력해주세요.';
    return false;
  }

  formErrorMessage.value = '';
  invalidField.value = '';
  return true;
};

const handleProductsInput = (event) => {
  if (!receiptDraft.value) return;

  receiptDraft.value.aiResult.products = event.target.value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  clearFieldError('products');
};

const handlePriceInput = (event) => {
  if (!receiptDraft.value) return;

  const onlyNumbers = event.target.value.replace(/[^0-9]/g, '');
  receiptDraft.value.aiResult.price =
    onlyNumbers === '' ? '' : Number(onlyNumbers);
  clearFieldError('price');
};

const fetchReceiptDraft = async () => {
  try {
    const data = await receiptStore.fetchReceiptDraft();

    if (!data) {
      throw new Error('잘못된 영수증 초안 접근');
    }

    receiptDraft.value = data;
  } catch (error) {
    console.error(error);
    alert('영수증 초안을 불러오지 못했습니다.');
    router.push('/receipt');
  }
};

const goBack = () => {
  router.push('/receipt');
};
// 데이터 저장
const receiptSave = async () => {
  if (!receiptDraft.value) return;

  formErrorMessage.value = '';

  if (!validateFormAndFocus()) {
    return;
  }

  isSaving.value = true;

  try {
    const ai = receiptDraft.value.aiResult;

    // 위도 경도 없으면 추가해주기
    if (!ai.location?.lat || !ai.location?.lng) {
      const location = await getLocationByPlace(ai.place);
      ai.location = location;
    }

    const payload = {
      ...receiptDraft.value,
      aiResult: {
        ...ai,
        price: Number(ai.price),
        products: normalizedProducts.value,
      },
    };

    if (!payload.aiResult.location?.lat || !payload.aiResult.location?.lng) {
      payload.aiResult.location.lat = '';
      payload.aiResult.location.lng = '';
    }
    const newTrans = {
      date: payload.aiResult.date,
      categoryId: payload.aiResult.categoryId,
      memo: payload.aiResult.memo,
      price: Number(payload.aiResult.price),
      type: 'expense',
      place: payload.aiResult.place,
      location: payload.aiResult.location,
      products: payload.aiResult.products,
      receiptRef: '',
    };
    // 거래 저장
    const trans = await transactionsStore.addTransactions(newTrans);
    // 영수증 저장
    // 한국시간으로 변경
    const getKoreaISOString = () => {
      const now = new Date();
      const koreaTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
      return koreaTime.toISOString().replace('Z', '+09:00');
    };
    const newReceipt = {
      id: payload.id ?? new Date().getTime(),
      transactionRef: trans.id,
      imageUrl: payload.imageUrl,
      ocrRawText: payload.ocrRawText ?? '',
      createdAt: getKoreaISOString(),
    };

    const savedReceipt = await receiptStore.addReceipt(newReceipt);
    await transactionsStore.updateTransactions(trans.id, {
      ...trans,
      receiptRef: savedReceipt.id,
    });
    // 임시 영수증 삭제
    await receiptStore.clearReceiptDraft();
    receiptDraft.value = null;

    // 페이지 이동
    alert('저장이 완료되었습니다.');
    router.push(`/transactions/${savedReceipt.transactionRef}`);
  } catch (error) {
    console.error(error);
    formErrorMessage.value = error.message || '저장 중 오류가 발생했습니다.';
  } finally {
    isSaving.value = false;
  }
};

onMounted(() => {
  fetchReceiptDraft();
});
</script>

<style scoped>
.receipt-detail-page {
  width: 100%;
  height: 100%;
  padding: 1.5rem;
  box-sizing: border-box;
}

.receipt-layout {
  width: 100%;
  min-height: 650px;
  display: flex;
  gap: 2rem;
  align-items: center;
  justify-content: center;
}

.receipt-image-panel {
  width: 38%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.receipt-image {
  width: 100%;
  max-width: 300px;
  object-fit: contain;
  border-radius: 4px;
}

.receipt-form-panel {
  width: 42%;
  max-width: 420px;
  background-color: #f1f1f3;
  border-radius: 17px;
  padding: 1.2rem;
  box-sizing: border-box;
}

.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 0.8rem;
}

.form-group label {
  font-size: 0.95rem;
  font-weight: 600;
  color: #222;
  margin-bottom: 0.35rem;
}

.form-group input {
  height: 42px;
  border: 1px solid #bcbcbc;
  border-radius: 6px;
  padding: 0 0.8rem;
  font-size: 0.95rem;
  box-sizing: border-box;
  background-color: #fff;
  color: black;
}

.form-group input::placeholder {
  color: #9aa0a6;
}

.form-group select {
  height: 42px;
  border: 1px solid #bcbcbc;
  border-radius: 6px;
  padding: 0 0.8rem;
  font-size: 0.95rem;
  box-sizing: border-box;
  background-color: #fff;
  color: black;
}

.form-error-message {
  margin: 6px 0 0;
  color: #d9534f;
  font-size: 13px;
  font-weight: 600;
}

.input-error {
  border: 1px solid #d9534f !important;
  box-shadow: 0 0 0 3px rgba(217, 83, 79, 0.12);
}

.input-error:focus {
  border: 1px solid #d9534f !important;
  outline: none;
  box-shadow: 0 0 0 3px rgba(217, 83, 79, 0.16);
}

.button-group {
  display: flex;
  width: 100%;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
  font-size: 16px;
}

.cancel-button,
.submit-button {
  width: 90%;
  min-width: 40px;
  height: 40px;
  border: none;
  border-radius: 6px;
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.cancel-button {
  background-color: #666;
}
.cancel-buttont:hover {
  background-color: #e0e0e0;
}

.submit-button {
  background-color: #5d6d97;
}
.submit-button:hover {
  background-color: 5d6d97;
}

.submit-button:disabled {
  background-color: #9fb9b5;
  cursor: not-allowed;
  opacity: 0.8;
}

.loading-box {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
