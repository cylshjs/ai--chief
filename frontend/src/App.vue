<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <el-container class="shell">
    <el-header class="nav" height="56px">
      <span class="brand">🍳 AI 私厨</span>
      <!-- router 模式下 index 就是路由路径，点菜单即跳转 -->
      <el-menu class="menu" mode="horizontal" router :default-active="route.path" :ellipsis="false">
        <el-menu-item index="/">对话</el-menu-item>
        <el-menu-item index="/history">会话</el-menu-item>
      </el-menu>
    </el-header>

    <el-main class="main">
      <RouterView />
    </el-main>
  </el-container>
</template>

<style scoped>
.shell {
  height: 100vh;
}
.nav {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  border-bottom: 1px solid var(--el-border-color);
}
.brand {
  font-weight: 600;
  white-space: nowrap;
}
.menu {
  flex: 1;
  border-bottom: none;
}
.main {
  padding: 1rem;
}
</style>
