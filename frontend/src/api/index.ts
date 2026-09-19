import type { ChatMessage, ChatRequest, PresignResult } from '@/types'

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}

/**
 * 流式对话。
 *
 * 后端虽然返了 text/event-stream 头，但 generator yield 的是裸文本片段，
 * 没有 `data: xxx\n\n` 分包 —— 所以既不能用 EventSource（它只支持 GET），
 * 也不能当标准 SSE 解析，只能自己读 body 流。
 */
export async function streamChat(
  body: ChatRequest,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch('/api/v1/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    onChunk(decoder.decode(value, { stream: true }))
  }
}

export async function getMessages(threadId: string): Promise<ChatMessage[]> {
  const res = await fetch(`/api/v1/chat/messages?thread_id=${encodeURIComponent(threadId)}`)
  return (await json<{ messages: ChatMessage[] }>(res)).messages
}

export async function clearMessages(threadId: string): Promise<void> {
  const res = await fetch(`/api/v1/chat/messages?thread_id=${encodeURIComponent(threadId)}`, {
    method: 'DELETE',
  })
  await json(res)
}

/** 换签名 → 直传 OSS → 返回可访问的图片地址 */
export async function uploadImage(file: File): Promise<string> {
  // OSS key 直接用原始文件名会互相覆盖，这里在客户端生成唯一 key
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const key = `${crypto.randomUUID()}.${ext}`

  const res = await fetch(`/api/v1/oss/presign?filename=${encodeURIComponent(key)}`)
  const { uploadUrl, contentType, accessUrl } = await json<PresignResult>(res)

  // Content-Type 必须和签名时的一致，否则 OSS 报 SignatureDoesNotMatch
  const put = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  })
  if (!put.ok) throw new Error(`上传失败 HTTP ${put.status}`)

  return accessUrl
}
