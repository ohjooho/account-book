<template>
  <div class="receipt-detail-page" v-if="receiptDraft">
    <div class="receipt-layout">
      <div class="receipt-image-panel">
        <img
          :src="receiptDraft.imageUrl"
          alt="영수증 이미지"
          class="receipt-image"
        />
      </div>

      <div class="receipt-form-panel">
        <div class="form-group">
          <label>날짜</label>
          <input v-model="receiptDraft.aiResult.date" type="text" />
        </div>

        <div class="form-group">
          <label>구매 장소</label>
          <input v-model="receiptDraft.aiResult.place" type="text" />
        </div>

        <div class="form-group">
          <label>구매 항목</label>
          <input
            :value="productsText"
            type="text"
            @input="handleProductsInput"
          />
        </div>

        <div class="form-group">
          <label>카테고리</label>
          <input v-model="receiptDraft.aiResult.categoryId" type="text" />
        </div>

        <div class="form-group">
          <label>메모</label>
          <input v-model="receiptDraft.aiResult.memo" type="text" />
        </div>

        <div class="form-group">
          <label>총 가격</label>
          <input v-model.number="receiptDraft.aiResult.price" type="number" />
        </div>

        <div class="button-group">
          <button class="cancel-button" @click="goBack">취소하기</button>
          <button class="submit-button">등록하기</button>
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

const route = useRoute();
const router = useRouter();
const receiptStore = useReceiptStore();

const receiptDraft = ref(null);

const productsText = computed(() => {
  if (!receiptDraft.value) return '';
  return receiptDraft.value.aiResult.products.join(', ');
});

const handleProductsInput = (event) => {
  if (!receiptDraft.value) return;

  receiptDraft.value.aiResult.products = event.target.value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const fetchReceiptDraft = async () => {
  try {
    const receiptId = route.params.receiptId;
    const data = await receiptStore.fetchReceiptDraft();

    if (!data || String(data.id) !== String(receiptId)) {
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

.loading-box {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #333;
  font-size: 1rem;
}
</style>
