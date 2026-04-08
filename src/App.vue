<template>
  <div class="app-container">
    <header class="app-header">
      <div class="logo" @click="$router.push('/')">가계부</div>
      <div class="user-profile">대충사람머리아이콘</div>
    </header>

    <div class="main-wrapper">
      <nav class="side-menu">
        <ul>
          <li @click="$router.push('/')">대시보드</li>
          <li @click="$router.push('/transactions')">거래 내역</li>
          <li @click="$router.push('/receipt')">AI 영수증 등록</li>
          <li @click="$router.push('/monthly')">월별 분석</li>
          <li @click="$router.push('/report')">AI 리포트</li>
          <li @click="$router.push('/map')">소비 지도</li>
        </ul>
      </nav>

      <main class="content-area">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.app-header {
  height: 60px;
  background-color: #292929;
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.main-wrapper {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.side-menu {
  width: 200px;
  background-color: #f5f5f5;
  border-right: 1px solid #ddd;
  padding: 20px 0;
}

.side-menu ul {
  list-style: none;
  padding: 0;
}

.side-menu li {
  padding: 15px 20px;
  cursor: pointer;
  transition: background 0.3s;
}

.side-menu li:hover {
  background-color: #e0e0e0;
}

.content-area {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}
</style>