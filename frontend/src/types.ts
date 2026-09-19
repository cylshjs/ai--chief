/** 对应后端 app/models/schemas.py 的 ChatRequest */
export interface ChatRequest {
  message: string
  image_url?: string | null
  thread_id: string
}

/** GET /api/v1/chat/messages 返回的条目 */
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  /** 用户上传的食材图（OSS 直传后拿到的地址）；assistant 消息恒为 null */
  image_url?: string | null
}

/** GET /api/v1/oss/presign 的返回 */
export interface PresignResult {
  uploadUrl: string
  contentType: string
  accessUrl: string
}

/**
 * 会话索引，只存在浏览器 localStorage 里。
 * 后端只认 thread_id，不存标题和时间 —— 所以换台设备这个列表就没了。
 */
export interface Conversation {
  id: string
  title: string
  updatedAt: number
}
