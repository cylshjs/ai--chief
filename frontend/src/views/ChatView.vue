<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { ElMessage, ElScrollbar } from 'element-plus'
import type { UploadFile } from 'element-plus'
import { Delete, Picture, Plus, Promotion, VideoPause } from '@element-plus/icons-vue'
import { useChatStore } from '@/stores/chat'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const chat = useChatStore()

/**
 * agent 输出的是 Markdown，用 {{ }} 插值会原样显示成带 ## 和 | 的纯文本。
 *
 * 必须过 DOMPurify：内容里混着 Tavily 搜来的网页文本，可能带 <script>
 * 或 <img onerror>，直接 v-html 就是一条 XSS 路径。
 * 只用于 assistant 消息 —— 用户自己发的仍旧文本插值，否则他打的 * 会变斜体。
 */
function render(text: string) {
  return DOMPurify.sanitize(marked.parse(text) as string)
}
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
        <!-- assistant 走 Markdown 渲染，user 保持纯文本 -->
        <div v-if="m.role === 'assistant'" class="bubble" v-html="render(m.content || '…')" />
        <div v-else class="bubble">
          <img v-if="m.image_url" :src="m.image_url" class="sent" alt="上传的食材图" />
          {{ m.content || '…' }}
        </div>
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
  word-break: break-word;
}
.row.user .bubble {
  /* 只给用户消息保留换行：assistant 是渲染后的 HTML，pre-wrap 会带出一堆空行 */
  white-space: pre-wrap;
  background: var(--el-color-primary);
  color: #fff;
}
/* 用户发出去的食材图。这个 img 写在模板里，不是 v-html 注入的，不用 :deep() */
.bubble .sent {
  display: block;
  max-width: 100%;
  border-radius: 6px;
  margin-bottom: 0.4rem;
}
/* v-html 注入的节点没有 scoped 的 data 属性，够不着，必须走 :deep() */
.bubble :deep(p) {
  margin: 0.4rem 0;
}
.bubble :deep(p:first-child) {
  margin-top: 0;
}
.bubble :deep(p:last-child) {
  margin-bottom: 0;
}
.bubble :deep(img) {
  /* 菜谱参考图是辅助信息，别撑满整个气泡。宽高都给上限，
     两个都写时浏览器会按比例缩到同时满足，不会拉变形 */
  max-width: min(100%, 240px);
  max-height: 180px;
  border-radius: 6px;
}
.bubble :deep(table) {
  border-collapse: collapse;
  margin: 0.5rem 0;
  font-size: 0.9em;
}
.bubble :deep(th),
.bubble :deep(td) {
  border: 1px solid var(--el-border-color);
  padding: 0.25rem 0.5rem;
}
.bubble :deep(th) {
  background: var(--el-fill-color);
}
.bubble :deep(h1),
.bubble :deep(h2),
.bubble :deep(h3) {
  font-size: 1.05em;
  margin: 0.6rem 0 0.3rem;
}
.bubble :deep(ul),
.bubble :deep(ol) {
  margin: 0.4rem 0;
  padding-left: 1.2rem;
}
.bubble :deep(code) {
  background: var(--el-fill-color);
  padding: 0.05rem 0.3rem;
  border-radius: 4px;
  font-size: 0.9em;
}
.bubble :deep(hr) {
  border: none;
  border-top: 1px solid var(--el-border-color);
  margin: 0.6rem 0;
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
