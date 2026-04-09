<template>
  <div class="account-viewport">
    <header class="account-header">
      <div class="header-content">
        <div class="logo-area">
          <img
            :src="getAssetUrl('Book.png')"
            alt="가계부"
            class="header-logo"
          />
          <h1 class="header-title">가계부</h1>
        </div>
        <img
          :src="getAssetUrl('account_circle.png')"
          alt="프로필"
          class="profile-icon"
        />
      </div>
    </header>

    <div class="main-body">
      <aside class="sidebar">
        <nav class="menu-list">
          <router-link
            v-for="menu in menuItems"
            :key="menu.name"
            :to="menu.path"
            class="menu-item"
            v-slot="{ isActive }"
            @mouseenter="hoveredMenu = menu.name"
            @mouseleave="hoveredMenu = null"
          >
            <img
              :src="
                getMenuIcon(
                  menu.iconBase,
                  isActive || hoveredMenu === menu.name,
                )
              "
              :alt="menu.label"
              class="menu-icon"
            />
            <span class="menu-label">{{ menu.label }}</span>
          </router-link>
        </nav>
      </aside>

      <main class="content-area">
        <router-view />
      </main>
    </div>
        <!-- 플로팅 + 버튼 -->
    <button class="floating-add-button" @click="goToCreate">+</button>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const hoveredMenu = ref(null);
const router = useRouter();


const menuItems = [
  { name: 'Dashboard', label: '대시보드', path: '/', iconBase: 'Setting_vert' },
  {
    name: 'Transactions',
    label: '거래 내역',
    path: '/transactions',
    iconBase: 'transactions',
  },
  {
    name: 'Receipt',
    label: 'AI 영수증 스캔',
    path: '/receipt',
    iconBase: 'receipt',
  },
  {
    name: 'Monthly',
    label: '월별 요약',
    path: '/monthly',
    iconBase: 'calendar',
  },
  {
    name: 'Report',
    label: 'AI 소비 분석',
    path: '/report',
    iconBase: 'report',
  },
  { name: 'Map', label: '소비 지도', path: '/map', iconBase: 'map' },
];

const getAssetUrl = (fileName) => {
  return new URL(`./assets/${fileName}`, import.meta.url).href;
};

/**
 * @param isHighlighted
 */
const getMenuIcon = (baseName, isHighlighted) => {
  const colorSuffix = isHighlighted ? '_black.png' : '_white.png';
  return new URL(`./assets/${baseName}${colorSuffix}`, import.meta.url).href;
};
// 플로팅 + 버튼 핸들러
const goToCreate = () => {
  router.push('/transactions/new');
};
</script>

<style scoped>
:root {
  --header-height: 80px;
  --sidebar-width: 300px;
}

.account-viewport {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f7;
  font-family: 'Noto Sans KR', sans-serif;
  overflow: hidden;
}

.account-header {
  height: var(--header-height);
  background-color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #eaeaea;
  position: sticky;
  top: 0;
  z-index: 1000;
}

.header-content {
  width: 100%;
  max-width: 1920px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 50px;
  box-sizing: border-box;
}

.logo-area {
  display: flex;
  align-items: center;
}

.header-logo {
  width: 28px;
  margin-right: 15px;
}

.header-title {
  font-size: 28px;
  font-weight: 700;
  color: #000000;
}

.profile-icon {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  cursor: pointer;
}

.main-body {
  display: flex;
  flex: 1;
  min-height: 0;
  width: 100%;
  max-width: 1920px;
  margin: 0 auto;
  overflow: hidden;
}

.sidebar {
  flex: 0 0 var(--sidebar-width);
  width: var(--sidebar-width);
  min-width: var(--sidebar-width);
  max-width: var(--sidebar-width);
  background-color: #292929;
  display: flex;
  flex-direction: column;
  padding: 40px 0;
  box-sizing: border-box;
  height: 100%;
  overflow: hidden;
  z-index: 100;
}

.menu-list {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.menu-item {
  width: 100%;
  height: 70px;
  display: flex;
  align-items: center;
  padding: 0 40px;
  box-sizing: border-box;
  color: #ffffff;
  font-size: 22px;
  font-weight: 600;
  text-decoration: none;
  transition:
    background-color 0.2s,
    color 0.2s,
    opacity 0.2s;
  cursor: pointer;
  opacity: 0.92;
}

.menu-icon {
  width: 32px;
  height: 32px;
  margin-right: 20px;
  flex-shrink: 0;
}

.menu-label {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-item:hover,
.router-link-exact-active {
  background-color: #ffffff;
  color: #000000;
  opacity: 1;
}

.content-area {
  flex: 1;
  min-width: 0;
  min-height: 0;
  height: 100%;
  padding: 40px;
  background-color: #f5f5f7;
  box-sizing: border-box;
  overflow-y: auto;
}

/* 플로팅 + 버튼 */
.floating-add-button {
  position: fixed;
  bottom: 32px;
  right: 32px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: #f8b333;
  color: #ffffff;
  border: none;
  font-size: 32px;
  font-weight: 300;
  cursor: pointer;
  z-index: 1000;
}
.floating-add-button:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}
.floating-add-button:active {
  transform: scale(0.95);
}

@media (max-width: 1024px) {
  .header-content {
    padding: 0 30px;
  }
  .sidebar {
    flex-basis: 250px;
    width: 250px;
    min-width: 250px;
    max-width: 250px;
  }
  .menu-item {
    font-size: 18px;
    padding: 0 25px;
  }
}
</style>
