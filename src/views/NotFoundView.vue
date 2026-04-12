<template>
  <div class="not-found">
    <h1>404</h1>
    <p>존재하지 않는 페이지입니다.</p>
    <router-link to="/">메인으로 이동</router-link>
  </div>
</template>

<script setup></script>

<style scoped>
.not-found {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 12px;
}
</style>
