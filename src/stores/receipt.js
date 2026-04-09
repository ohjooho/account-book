import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';

export const useReceiptStore = defineStore('receipt', () => {
  const BASEURI = '/api/receiptDraft';
  const receiptDraft = ref(null);

  //임시 영수증 조회
  const fetchReceiptDraft = async () => {
    try {
      const response = await axios.get(BASEURI);
      receiptDraft.value = response.data;
      console.log(response);
      return response.data;
    } catch (e) {
      console.log(e);
      console.error('receiptDraft 조회 실패:', e);
      throw e;
    }
  };

  //임시 영수증 저장
  const saveReceiptDraft = async (draftData) => {
    try {
      const response = await axios.put(BASEURI, draftData);
      receiptDraft.value = response.data;
      console.log(response.data);
      return response.data;
    } catch (e) {
      console.error('receiptDraft 저장 실패:', e);
      throw e;
    }
  };

  //임시 영수증 삭제(거래내역으로 저장 혹은 예외 상황 발생시)
  const clearReceiptDraft = async () => {
    try {
      const response = await axios.put(BASEURI, {});
      receiptDraft.value = response.data;
      return response.data;
    } catch (e) {
      console.error('receiptDraft 초기화 실패:', e);
      throw e;
    }
  };

  return {
    receiptDraft,
    fetchReceiptDraft,
    saveReceiptDraft,
    clearReceiptDraft,
  };
});
