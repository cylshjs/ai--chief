// 自检：node src/stores/conversations.check.ts   （或 npm run check）
// 不引任何测试框架，只用 node 自带的 assert。
import assert from 'node:assert/strict'
import { MAX_CONVERSATIONS, upsert } from './conversations.ts'
import type { Conversation } from '../types.ts'

const c = (id: string, title: string, updatedAt = 0): Conversation => ({ id, title, updatedAt })

// 新会话插到最前
assert.deepEqual(
  upsert([c('a', 'A')], 'b', 'B', 100).map((x) => x.id),
  ['b', 'a'],
)

// 已存在的会话只是被顶到最前，不能出现重复项
const twice = upsert([c('a', 'A'), c('b', 'B')], 'b', undefined, 100)
assert.deepEqual(
  twice.map((x) => x.id),
  ['b', 'a'],
)
assert.equal(twice.length, 2)
assert.equal(twice[0].updatedAt, 100)

// 不传标题时保留原标题；只有全新的会话才用兜底文案
assert.equal(upsert([c('a', '番茄炒蛋')], 'a', undefined, 1)[0].title, '番茄炒蛋')
assert.equal(upsert([], 'x', undefined, 1)[0].title, '新会话')

// 超过上限从尾部挤掉，留下的顺序是最新在前
const n = MAX_CONVERSATIONS + 3
let list: Conversation[] = []
for (let i = 0; i < n; i++) list = upsert(list, `id${i}`, `T${i}`, i)
assert.equal(list.length, MAX_CONVERSATIONS)
assert.deepEqual(
  list.map((x) => x.id),
  Array.from({ length: MAX_CONVERSATIONS }, (_, k) => `id${n - 1 - k}`),
)

// 纯函数：不能改动传进来的数组
const original = [c('a', 'A')]
upsert(original, 'b', 'B')
assert.equal(original.length, 1)

console.log('✓ conversations 自检通过')
