<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { ElMessage, ElScrollbar } from 'element-plus'
import type { UploadFile } from 'element-plus'
import { Delete, Picture, Plus, Promotion, VideoPause } from '@element-plus/icons-vue'
import { useChatStore } from '@/stores/chat'

const chat = useChatStore()
const draft = ref('')
const picked = ref<File | null>(null)
const pickedName = ref('')
const scrollbar = ref<InstanceType<typeof ElScrollbar> | null>(null)

onMounted(() => {
  if (!chat.messages.length) chat.load()
})

// 新消息 / 流式追加时把滚动条钉到底部
watch(
  () => chat.messages.at(-1)?.content,
  async () => {
    await nextTick()
    scrollbar.value?.setScrollTop(1e9)
  },
)

// el-upload 关掉自动上传，只当文件选择器；真正的上传在 store 里走 OSS 直传
function onPick(f: UploadFile) {
  picked.value = f.raw ?? null
  pickedName.value = f.name
}

function clearPick() {
  picked.value = null
  pickedName.value = ''
}

async function submit() {
  if (chat.streaming) return
  const text = draft.value
  draft.value = ''
  const file = picked.value
  clearPick()
  await chat.send(text || '帮我看看这些食材能做什么', file)
}

async function clear() {
  await chat.clear()
  ElMessage.success('已清空当前会话')
}
</script>

<template>
  <div class="chat">
    <div class="bar">
      <el-tag type="info" effect="plain" class="title">{{ chat.currentTitle }}</el-tag>
      <div class="grow" />
      <el-button :icon="Delete" :disabled="chat.streaming" @click="clear">清空</el-button>
      <el-button :icon="Plus" :disabled="chat.streaming" @click="chat.reset">新会话</el-button>
    </div>

    <el-scrollbar ref="scrollbar" class="list">
      <el-empty v-if="!chat.messages.length" description="拍张冰箱照片，或者直接报菜名" />
      <div v-for="(m, i) in chat.messages" :key="i" class="row" :class="m.role">
        <el-avatar :size="32" class="who">{{ m.role === 'user' ? '我' : '厨' }}</el-avatar>
        <div class="bubble">{{ m.content || '…' }}</div>
      </div>
    </el-scrollbar>

    <el-alert v-if="chat.error" :title="chat.error" type="error" show-icon :closable="false" />

    <div class="composer">
      <el-upload :auto-upload="false" :show-file-list="false" accept="image/*" :on-change="onPick">
        <el-button :icon="Picture" :disabled="chat.streaming">图片</el-button>
      </el-upload>

      <el-tag v-if="pickedName" closable @close="clearPick">{{ pickedName }}</el-tag>

      <el-input
        v-model="draft"
        type="textarea"
        resize="none"
        :autosize="{ minRows: 1, maxRows: 5 }"
        placeholder="有哪些食材？（Enter 发送，Shift+Enter 换行）"
        :disabled="chat.streaming"
        @keydown.enter.exact.prevent="submit"
      />

      <el-button v-if="chat.streaming" :icon="VideoPause" @click="chat.stop">停止</el-button>
      <el-button v-else type="primary" :icon="Promotion" :disabled="!chat.canSend" @click="submit">
        发送
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.chat {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.grow {
  flex: 1;
}
.list {
  flex: 1;
  min-height: 0;
}
.row {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  margin-bottom: 0.75rem;
}
.row.user {
  flex-direction: row-reverse;
}
.who {
  flex: none;
  background: var(--el-color-primary);
}
.row.assistant .who {
  background: var(--el-fill-color);
  color: var(--el-text-color-primary);
}
.bubble {
  max-width: 76%;
  padding: 0.55rem 0.85rem;
  border-radius: 10px;
  background: var(--el-fill-color-light);
  white-space: pre-wrap;
  word-break: break-word;
}
.row.user .bubble {
  background: var(--el-color-primary);
  color: #fff;
}
.composer {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
}
.composer :deep(.el-upload) {
  flex: none;
  display: block;
}
</style>
