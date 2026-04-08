import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';

export const useTransactionsStore = defineStore('transactions', () => {
  const BASEURI = '/api/transactions';
  const transactions = ref([]);

  //거래 목록 조회(tran-001)
  const fetchTransactions = async () => {
    try {
      const response = await axios.get(BASEURI);
      console.log('데이터 출력');
      console.log(response.data);
      transactions.value = response.data;
    } catch (e) {
      console.error('거래 목록 조회 실패: ', e);
    }
  };

  // 거래 상세 조회 (tran-003)
  const fetchTransactionById = async (id) => {
    try {
      const response = await axios.get(`${BASEURI}/${id}`);
      return response.data;
    } catch (e) {
      console.error('거래 상세 조회 실패:', e);
    }
  };

  // 거래 추가 (tran-002)
  const addTransactions = async (newTransaction) => {
    try {
      const response = await axios.post(BASEURI, {
        ...newTransaction,
        id: new Date.gettime(),
      });
      transactions.value.push(response.data);
    } catch (e) {
      console.error('거래 추가 실패:', e);
    }
  };

  // 거래 수정 (tran-004)
  const updateTransactions = async (id, updates) => {
    try {
      const response = await axios.put(`${BASEURI}/${id}`, updates);
      const index = transactions.value.findIndex((t) => t.id === Number(id));
      if (index !== -1) {
        transactions.value[index] = response.data;
      }
    } catch (e) {
      console.error('거래 수정 실패:', e);
    }
  };

  // 거래 삭제 (tran-005)
  const deleteTransactions = async (id) => {
    try {
      await axios.delete(`${BASEURI}/${id}`);
      transactions.value = transactions.value.filter(
        (t) => t.id !== Number(id),
      );
    } catch (e) {
      console.error('거래 삭제 실패:', e);
    }
  };

  return {
    transactions,
    fetchTransactions,
    fetchTransactionById,
    addTransactions,
    updateTransactions,
    deleteTransactions,
  };
});
