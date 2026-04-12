import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';

export const useTransactionsStore = defineStore('transactions', () => {
  const BASEURI = '/api/transactions';
  const RECEIPTURI = '/api/receipts';
  const transactions = ref([]);

  //거래 목록 조회(tran-001)
  const fetchTransactions = async () => {
    try {
      const response = await axios.get(BASEURI);
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
        id: new Date().getTime(),
      });
      transactions.value.push(response.data);
      return response.data;
    } catch (e) {
      console.error('거래 추가 실패:', e);
      throw e;
    }
  };

  // 거래 수정 (tran-004)
  const updateTransactions = async (id, updates) => {
    try {
      const response = await axios.put(`${BASEURI}/${id}`, updates);
      const index = transactions.value.findIndex(
        (t) => String(t.id) === String(id),
      );
      if (index !== -1) {
        transactions.value[index] = response.data;
      }
      return response.data;
    } catch (e) {
      console.error('거래 수정 실패:', e);
      throw e;
    }
  };

  // 거래 삭제 (tran-005)
  const deleteTransactions = async (id) => {
    try {
      const receiptResponse = await axios.get(RECEIPTURI);
      const matchedReceipt = receiptResponse.data.find(
        (r) => String(r.transactionRef) === String(id),
      );

      if (matchedReceipt?.imageUrl) {
        await axios.delete('http://localhost:3001/upload', {
          data: { imagePath: matchedReceipt.imageUrl },
        });
      }

      if (matchedReceipt) {
        await axios.delete(`${RECEIPTURI}/${matchedReceipt.id}`);
      }

      await axios.delete(`${BASEURI}/${id}`);
      transactions.value = transactions.value.filter(
        (t) => String(t.id) !== String(id),
      );
    } catch (e) {
      console.error('거래 삭제 실패:', e);
      throw e;
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
