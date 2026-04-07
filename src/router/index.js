import DashboardView from "@/views/DashboardView.vue";
import { createRouter, createWebHistory } from "vue-router";

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue')
  },
  {
    path: '/transactions',
    name: 'transactions',
    children: [
      {path: '', component: () => import('@/views/transactions/TransactionListView.vue')},
      {path: 'new', component: () => import('@/views/transactions/TransactionFormView.vue')},
      {path: '', component: () => import('@/views/transactions/TransactionDetailView.vue')}, 
    ]
  },
  {
    path: '/analysis/:date',
    name: 'analysis',
    component: () => import('@/views/AnalysisView.vue')
  },
  {
    path: '/receipt',
    name: 'receipt',
    children: [
      {path: '', component: () => import('@/views/receipt/ReceiptUploadView.vue')},
      {path: 'new', component: () => import('@/views/receipt/ReceiptConfirmView.vue')}
    ]
  },
  {
    path: '/report',
    name: 'report',
    component: () => import('@/views/ReportView.vue')
  },
  {
    path: '/map',
    name: 'map',
    component: () => import('@/views/MapView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router;

