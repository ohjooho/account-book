<template>
  <div>
    <h1>transactions page</h1>
    <p>데이터 {{ transactionsStore.transactions.length }} 건</p>
    <p>카테고리 {{ categoryStore.categories.length }} 개</p>
    <p>카테고리 데이터 예시: {{ categoryStore.categories[0] }}</p>
    <p>
      특정 카테고리 찾기:
      {{ categoryStore.getCategoryById('transport').labelKo }}
    </p>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useTransactionsStore } from '@/stores/transactions';
import { useCategoryStore } from '@/stores/category';

const transactionsStore = useTransactionsStore();
const categoryStore = useCategoryStore();

onMounted(async () => {
  await transactionsStore.fetchTransactions();
  await categoryStore.fetchCategories();

  const foodCategory = categoryStore.getCategoryById('food');
  console.log('찾은 카테고리:', foodCategory.id);
  console.log(foodCategory.labelKo);
});
</script>
