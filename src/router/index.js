import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    // main-001: 메인 페이지(대시보드)
    path: '/',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
  },
  {
    // tran-001, 002, 003: 거래 내역 조회
    path: '/transactions',
    children: [
      {
        path: '',
        name: 'transactions',
        component: () => import('@/views/transactions/TransactionListView.vue'),
      },
      // tran-002: 내역 작성
      {
        path: 'new',
        name: 'transactions-create',
        component: () => import('@/views/transactions/TransactionFormView.vue'),
      },
      // tran-003: 내역 상세(수정, 삭제 포함)
      {
        path: ':id',
        name: 'transactions-detail',
        component: () =>
          import('@/views/transactions/TransactionDetailView.vue'),
      },
    ],
  },
  {
    // monthly-001: 월별 분석
    path: '/monthly',
    name: 'monthly',
    component: () => import('@/views/MonthlySummaryView.vue'),
  },
  {
    // receipt-001, 002: AI 영수증 첨부 및 등록
    path: '/receipt',
    children: [
      // receipt-001
      {
        path: '',
        name: 'receipt-upload',
        component: () => import('@/views/receipt/ReceiptUploadView.vue'),
      },
      // receipt-002
      {
        path: ':id',
        name: 'receipt-confirm',
        component: () => import('@/views/receipt/ReceiptConfirmView.vue'),
      },
    ],
  },
  {
    // report-001
    path: '/report',
    name: 'report',
    component: () => import('@/views/ReportView.vue'),
  },
  {
    // map-001
    path: '/map',
    name: 'map',
    component: () => import('@/views/MapView.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;