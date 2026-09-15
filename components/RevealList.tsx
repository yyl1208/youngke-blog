'use client'

import { Children, useState } from 'react'

/**
 * 首页列表的「展开更多」。
 *
 * 条目由服务端组件渲染好后作为 children 传进来，这里只负责切片——
 * 所以列表长什么样（卡片还是行）由调用方决定，组件不关心。
 *
 * 静态导出下条目本来就在 HTML 里，展开只是视觉上的收放，不发请求。
 */
export default function RevealList({
  children,
  initial = 5,
  step = 5,
  unit = '条',
}: {
  children: React.ReactNode
  initial?: number
  step?: number
  unit?: string
}) {
  const items = Children.toArray(children)
  const [shown, setShown] = useState(initial)

  const rest = items.length - shown
  const expanded = shown > initial

  // 数量没超上限就不渲染按钮，避免「展开更多 · 还有 0 条」
  if (rest <= 0 && !expanded) {
    return <ul className="item-list">{items}</ul>
  }

  return (
    <>
      <ul className="item-list">{items.slice(0, shown)}</ul>

      <div className="reveal-row">
        {rest > 0 && (
          <button
            type="button"
            className="reveal-more"
            onClick={() => setShown((n) => Math.min(n + step, items.length))}
          >
            展开更多 · 还有 {rest} {unit}
          </button>
        )}

        {expanded && (
          <button
            type="button"
            className="reveal-more is-collapse"
            onClick={() => setShown(initial)}
          >
            收起
          </button>
        )}
      </div>
    </>
  )
}
