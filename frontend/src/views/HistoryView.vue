<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import { MAX_CONVERSATIONS } from '@/stores/conversations.ts'
import { useChatStore } from '@/stores/chat'

const chat = useChatStore()
const router = useRouter()

function ago(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return '刚刚'
  if (s < 3600) return `${Math.floor(s / 60)} 分钟前`
  if (s < 86400) return `${Math.floor(s / 3600)} 小时前`
  const d = Math.floor(s / 86400)
  return d < 30 ? `${d} 天前` : new Date(ts).toLocaleDateString()
}

function open(id: string) {
  chat.selectThread(id)
  router.push('/')
}

async function del(id: string, title: string) {
  try {
    await ElMessageBox.confirm(`删除「${title}」？这条会话在后端的记录也会一起删掉。`, '删除会话', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return // 点了取消
  }
  await chat.remove(id)
  ElMessage.success('已删除')
}
</script>

<template>
  <div class="history">
    <el-card shadow="never">
      <template #header>
        <div class="head">
          <b>最近会话</b>
          <span class="count">最多保留 {{ MAX_CONVERSATIONS }} 个</span>
        </div>
      </template>

      <el-empty v-if="!chat.conversations.length" description="还没有会话，先去聊两句" />

      <ul v-else class="list">
        <li
          v-for="c in chat.conversations"
          :key="c.id"
          :class="{ current: c.id === chat.threadId }"
        >
          <button class="row" @click="open(c.id)">
            <span class="title">{{ c.title }}</span>
            <span class="time">{{ ago(c.updatedAt) }}</span>
          </button>
          <el-button :icon="Delete" text circle title="删除" @click="del(c.id, c.title)" />
        </li>
      </ul>
    </el-card>

    <p class="note">
      列表存在浏览器本地，后端只认 thread_id。换设备或清缓存后这个列表会丢，
      但后端的数据还在 —— 那时只能靠 thread_id 找回来。
    </p>
  </div>
</template>

<style scoped>
.history {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.count {
  font-size: 0.8rem;
  color: var(--el-text-color-secondary);
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.list li {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.list li:last-child {
  border-bottom: none;
}
.list li.current .title {
  color: var(--el-color-primary);
  font-weight: 600;
}
.row {
  flex: 1;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  min-width: 0;
  padding: 0.65rem 0.5rem;
  border: none;
  background: none;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  border-radius: 6px;
}
.row:hover {
  background: var(--el-fill-color-light);
}
.title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.time {
  flex: none;
  font-size: 0.8rem;
  color: var(--el-text-color-secondary);
}
.note {
  margin: 0;
  font-size: 0.8rem;
  color: var(--el-text-color-secondary);
}
</style>
