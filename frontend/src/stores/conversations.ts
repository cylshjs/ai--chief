import type { Conversation } from '../types.ts'

/** 列表只保留最近这几个；想留更多改这里就行 */
export const MAX_CONVERSATIONS = 5

/**
 * 把一个会话顶到列表最前，超出上限的从尾部挤掉。
 *
 * 纯函数：不碰 localStorage、不碰 Vue，所以能直接用 node 跑（见 conversations.check.ts）。
 * 注意挤掉的只是索引，后端的 checkpoint 不动 —— 用户主动删才走 store 里的 remove()。
 */
export function upsert(
  list: Conversation[],
  id: string,
  title?: string,
  now: number = Date.now(),
): Conversation[] {
  const prev = list.find((c) => c.id === id)
  const rest = list.filter((c) => c.id !== id)
  return [{ id, title: title || prev?.title || '新会话', updatedAt: now }, ...rest].slice(
    0,
    MAX_CONVERSATIONS,
  )
}
