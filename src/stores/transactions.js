import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import axios from 'axios';

export const useTransactionsStore = defineStore('transactions', () => {
  const BASEURI = '/api/transactions';
  const state = reactive({});
  const transactions = ref([]);

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(BASEURI);
      console.log(response.data);
      transactions.value = response.data;
    } catch (e) {
      console.log(e);
    }
  };

  return { state, transactions, fetchTransactions };
});
