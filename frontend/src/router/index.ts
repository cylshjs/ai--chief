import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  // history 模式，刷新任意子路由由后端 404 handler 回落到 index.html（见 app/main.py）
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'chat', component: () => import('@/views/ChatView.vue') },
    { path: '/history', name: 'history', component: () => import('@/views/HistoryView.vue') },
  ],
})
