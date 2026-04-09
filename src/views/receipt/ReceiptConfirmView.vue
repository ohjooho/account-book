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
          <label>날짜</label>
          <input v-model="receiptDraft.aiResult.date" type="date" />
        </div>

        <div class="form-group">
          <label>구매 장소</label>
          <input
            v-model.trim="receiptDraft.aiResult.place"
            type="text"
            placeholder="ex) 씨유 세종대후문점"
          />
        </div>

        <div class="form-group">
          <label>구매 항목</label>
          <input
            :value="productsText"
            type="text"
            placeholder="쉼표(,)로 구분해서 입력해주세요."
            @input="handleProductsInput"
          />
        </div>

        <div class="form-group">
          <label>카테고리</label>
          <input v-model="receiptDraft.aiResult.categoryId" type="text" />
        </div>

        <div class="form-group">
          <label>메모</label>
          <input
            v-model="receiptDraft.aiResult.memo"
            placeholder="구매 내용을 입력해주세요."
            type="text"
          />
        </div>

        <div class="form-group">
          <label>총 가격</label>
          <input
            :value="priceInput"
            type="text"
            inputmode="numeric"
            placeholder="숫자만 입력해주세요."
            @input="handlePriceInput"
          />
        </div>
        <p v-if="formErrorMessage" class="form-error-message">
          {{ formErrorMessage }}
        </p>
        <div class="button-group">
          <button class="cancel-button" @click="goBack">취소하기</button>
          <button
            class="submit-button"
            :disabled="!isFormValid || isSaving"
            @click="receiptSave"
          >
            {{ isSaving ? '등록 중...' : '등록하기' }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="loading-box">불러오는 중...</div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useReceiptStore } from '@/stores/receipt';
import { getLocationByPlace } from '@/utils/kakaoMap';

const route = useRoute();
const router = useRouter();
const receiptStore = useReceiptStore();

const receiptDraft = ref(null);
const isSaving = ref(false);
const formErrorMessage = ref('');
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
const isFormValid = computed(() => {
  if (!receiptDraft.value.aiResult) return false;

  const ai = receiptDraft.value.aiResult;
  return (
    !!ai.date &&
    !!ai.place?.trim() &&
    !!ai.categoryId?.trim() &&
    !!ai.memo?.trim() &&
    normalizedProducts.value.length > 0 &&
    String(ai.price).trim() !== '' &&
    Number(ai.price) > 0
  );
});
const handleProductsInput = (event) => {
  if (!receiptDraft.value) return;

  receiptDraft.value.aiResult.products = event.target.value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const handlePriceInput = (event) => {
  if (!receiptDraft.value) return;

  const onlyNumbers = event.target.value.replace(/[^0-9]/g, '');
  receiptDraft.value.aiResult.price =
    onlyNumbers === '' ? '' : Number(onlyNumbers);
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

const receiptSave = async () => {
  if (!receiptDraft.value) return;

  formErrorMessage.value = '';

  if (!isFormValid.value) {
    formErrorMessage.value = '모든 항목을 입력해야 등록할 수 있어요.';
    return;
  }

  isSaving.value = true;

  try {
    const ai = receiptDraft.value.aiResult;

    if (!ai.location?.lat || !ai.location?.lng) {
      const location = await getLocationByPlace(ai.place);

      ai.location = location;
    }
    console.log(ai.location);
    const payload = {
      ...receiptDraft.value,
      aiResult: {
        ...ai,
        price: Number(ai.price),
        products: normalizedProducts.value,
      },
    };
    console.log(payload);
    if (!payload.aiResult.location?.lat || !payload.aiResult.location?.lng) {
      throw new Error(
        '구매 장소의 좌표를 찾을 수 없습니다. 다른 장소를 적어주세요.',
      );
    }
    // 데이터 저장

    // 페이지 이동

    // 임시 영수증 삭제
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
  background-color: #f3f3f3;
  border-radius: 10px;
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

.form-error-message {
  margin: 6px 0 0;
  color: #d9534f;
  font-size: 13px;
  font-weight: 600;
}

.button-group {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
}

.cancel-button,
.submit-button {
  min-width: 90px;
  height: 40px;
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.cancel-button {
  background-color: #d97b87;
}

.submit-button {
  background-color: #4e8780;
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
