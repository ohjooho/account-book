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
  </div>
</template>

<script setup>
import { ref } from 'vue';

const hoveredMenu = ref(null);

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
</script>

<style scoped>
:root {
  --header-height: 80px;
  --sidebar-width: 300px;
}

.account-viewport {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f7;
  font-family: 'Noto Sans KR', sans-serif;
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
  width: 100%;
  max-width: 1920px;
  margin: 0 auto;
}

.sidebar {
  width: var(--sidebar-width);
  background-color: #292929;
  display: flex;
  flex-direction: column;
  padding: 40px 0;
  flex-shrink: 0;
  position: sticky;
  top: var(--header-height);
  height: calc(100vh - var(--header-height));
  z-index: 100;
}

.menu-list {
  display: flex;
  flex-direction: column;
}

.menu-item {
  height: 70px;
  display: flex;
  align-items: center;
  padding: 0 40px;
  color: #ffffff;
  font-size: 22px;
  text-decoration: none;
  transition:
    background-color 0.2s,
    color 0.2s;
  cursor: pointer;
}

.menu-icon {
  width: 32px;
  height: 32px;
  margin-right: 20px;
}

.menu-item:hover,
.router-link-exact-active {
  background-color: #ffffff;
  color: #000000;
  font-weight: 600;
}

.content-area {
  flex: 1;
  padding: 40px;
  background-color: #f5f5f7;
}

@media (max-width: 1024px) {
  .header-content {
    padding: 0 30px;
  }
  .sidebar {
    width: 250px;
  }
  .menu-item {
    font-size: 18px;
    padding: 0 25px;
  }
}
</style>
