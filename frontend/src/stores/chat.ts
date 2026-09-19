import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { clearMessages, getMessages, streamChat, uploadImage } from '@/api'
import { upsert } from './conversations.ts'
import type { ChatMessage, Conversation } from '@/types'

const THREAD_KEY = 'ai-chief:thread-id'
const LIST_KEY = 'ai-chief:conversations'
/** 标题取首条用户消息的前 N 个字 */
const TITLE_LEN = 18

/** 默认一个新 thread_id：localStorage 让刷新后还能接着聊 */
const initialThreadId = () => localStorage.getItem(THREAD_KEY) || crypto.randomUUID()

function loadConversations(): Conversation[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LIST_KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

export const useChatStore = defineStore('chat', () => {
  const threadId = ref(initialThreadId())
  const conversations = ref<Conversation[]>(loadConversations())
  const messages = ref<ChatMessage[]>([])
  const streaming = ref(false)
  const error = ref('')

  // 留着给"停止生成"用；不进 ref，它是控制句柄不是渲染状态
  let controller: AbortController | null = null

  const persist = () => localStorage.setItem(THREAD_KEY, threadId.value)
  const persistList = () => localStorage.setItem(LIST_KEY, JSON.stringify(conversations.value))

  /** 把会话顶到列表最前并落盘，排序/挤出规则在 conversations.ts 里（带自检） */
  function touch(id: string, title?: string) {
    conversations.value = upsert(conversations.value, id, title)
    persistList()
  }

  /** 换会话：清空本地列表，消息由调用方接着 load() */
  function selectThread(id: string) {
    stop()
    threadId.value = id
    persist()
    messages.value = []
  }

  function reset() {
    // 新会话先不进列表 —— 一句没聊过的会话没必要占位，发第一条时由 touch() 加进去
    selectThread(crypto.randomUUID())
  }

  /** 删掉一个会话：索引和后端 checkpoint 一起删 */
  async function remove(id: string) {
    conversations.value = conversations.value.filter((c) => c.id !== id)
    persistList()
    if (id === threadId.value) reset()
    try {
      await clearMessages(id)
    } catch (e) {
      error.value = (e as Error).message
    }
  }

  async function send(text: string, file?: File | null) {
    const message = text.trim()
    if (!message || streaming.value) return

    error.value = ''
    streaming.value = true
    const isFirst = !messages.value.length
    try {
      const imageUrl = file ? await uploadImage(file) : null

      messages.value.push({ role: 'user', content: message, image_url: imageUrl })
      // 会话的第一句话拿来当标题，这样列表里认得出是哪一顿
      touch(threadId.value, isFirst ? message.slice(0, TITLE_LEN) : undefined)

      // 用 reactive 对象推进数组，流式追加时 Vue 能精确更新这一条，不用整体替换数组
      const reply = reactive<ChatMessage>({ role: 'assistant', content: '' })
      messages.value.push(reply)

      controller = new AbortController()
      await streamChat(
        { message, image_url: imageUrl, thread_id: threadId.value },
        (chunk) => {
          reply.content += chunk
        },
        controller.signal,
      )
    } catch (e) {
      const err = e as Error
      if (err.name === 'AbortError') return
      error.value = err.message
      // 没吐出任何内容的空气泡留着没意义，扔掉
      const last = messages.value.at(-1)
      if (last?.role === 'assistant' && !last.content) messages.value.pop()
    } finally {
      streaming.value = false
      controller = null
    }
  }

  function stop() {
    controller?.abort()
    controller = null
    streaming.value = false
  }

  /** 拉后端 checkpoint 里的历史，用来恢复会话 */
  async function load() {
    error.value = ''
    try {
      messages.value = await getMessages(threadId.value)
    } catch (e) {
      error.value = (e as Error).message
    }
  }

  async function clear() {
    stop()
    try {
      await clearMessages(threadId.value)
      messages.value = []
    } catch (e) {
      error.value = (e as Error).message
    }
  }

  return {
    threadId,
    conversations,
    messages,
    streaming,
    error,
    canSend: computed(() => !streaming.value),
    currentTitle: computed(
      () => conversations.value.find((c) => c.id === threadId.value)?.title ?? '新会话',
    ),
    send,
    stop,
    load,
    clear,
    reset,
    remove,
    selectThread,
  }
})
