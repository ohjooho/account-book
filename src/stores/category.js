// src/stores/category.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';

export const useCategoryStore = defineStore('category', () => {
  const BASEURI = '/api/categories';

  const categories = ref([]);

  // 카테고리 전체 조회
  const fetchCategories = async () => {
    try {
      const response = await axios.get(BASEURI);
      console.log('category response', response);
      console.log('category response.data', response.data);
      categories.value = response.data;
      console.log(categories);
    } catch (e) {
      console.error('카테고리 조회 실패:', e);
    }
  };

  // id로 특정 카테고리 찾기 (이미 불러온 데이터에서)
  const getCategoryById = (id) => {
    return categories.value.find((c) => c.id === id);
  };

  return {
    categories,
    fetchCategories,
    getCategoryById,
  };
});
