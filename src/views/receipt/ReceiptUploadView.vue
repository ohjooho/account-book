<template>
  <div class="container">
    <div class="receiptArea">
      <font-awesome-icon icon="fa-solid fa-receipt" class="receiptImage" />
      <button class="receiptButton">영수증 첨부</button>
    </div>
  </div>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
</script>

<style scope>
.container {
  width: 100%;
  height: 90%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.receiptArea {
  width: 50%;
  height: 50%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.receiptImage {
  width: 50%;
  height: 50%;
  min-width: 120px;
  padding-bottom: 2rem;
  color: black;
}

.receiptButton {
  width: 30%;
  height: 15%;
  min-width: 120px;
  font-size: 1rem;
  font-weight: 700;
  background-color: #4e8780;
  border-radius: 17px;
}
</style>
