<template>
  <div>
    <h1>transactions page</h1>
    <p>{{ store.transactions.length }} 건</p>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useTransactionsStore } from '@/stores/transactions';

const store = useTransactionsStore();

onMounted(() => {
  store.fetchTransactions();
});
</script>
