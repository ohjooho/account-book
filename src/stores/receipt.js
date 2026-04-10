import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';

export const useReceiptStore = defineStore('receipt', () => {
  const BASEURI = '/api/receiptDraft';
  const RECEIPTURI = '/api/receipts';
  const UPLOAD_URI = 'http://localhost:3001/upload';
  const receiptDraft = ref(null);
  const receipts = ref([]);

  //임시 영수증 조회
  const fetchReceiptDraft = async () => {
    try {
      const response = await axios.get(BASEURI);
      receiptDraft.value = response.data;
      return response.data;
    } catch (e) {
      console.log(e);
      console.error('receiptDraft 조회 실패:', e);
      throw e;
    }
  };

  // 임시 영수증을 진짜 영수증으로 저장
  const addReceipt = async (newReceipt) => {
    try {
      const response = await axios.post(RECEIPTURI, newReceipt);
      receipts.value.push(response.data);
      return response.data;
    } catch (e) {
      console.error('영수증 추가 실패:', e);
      throw e;
    }
  };

  //임시 영수증 저장
  const saveReceiptDraft = async (draftData) => {
    try {
      const response = await axios.put(BASEURI, draftData);
      receiptDraft.value = response.data;
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

  // 영수증 이미지 업로드
  const uploadReceiptImage = async (file, receiptId) => {
    try {
      const formData = new FormData();
      formData.append('receiptId', receiptId);
      formData.append('file', file);

      const response = await axios.post(UPLOAD_URI, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data.imagePath;
    } catch (e) {
      console.error('영수증 이미지 업로드 실패:', e);
      throw e;
    }
  };

  return {
    receipts,
    receiptDraft,
    fetchReceiptDraft,
    addReceipt,
    saveReceiptDraft,
    clearReceiptDraft,
    uploadReceiptImage,
  };
});
