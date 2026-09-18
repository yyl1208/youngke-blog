import Link from 'next/link'
import { getAllNow } from '@/lib/now'

/**
 * 首页 Now 区块：列出「现在在做的事」。
 *
 * 一行一件事，点进 /now/<id> 看具体内容。
 * 这里不显示任何状态：没有进度、没有完成度、没有已完成/未完成之分。
 *
 * 内容全在 content/now/*.md，加一件事就是新建一个 md 文件，
 * 不用碰这个组件。服务端组件，构建期就定死了。
 */
export default function NowList() {
  const items = getAllNow()

  if (items.length === 0) {
    return (
      <p className="empty-note">
        还没有内容。在 <code className="code-inline">content/now/</code>{' '}
        里新建一个 .md 就会出现在这里。
      </p>
    )
  }

  return (
    <ul className="now-list">
      {items.map((item) => (
        <li key={item.id}>
          <Link href={`/now/${item.id}/`} className="np-row">
            <span className="np-main">
              <span className="np-title">{item.title}</span>
              {item.note && <span className="np-note">{item.note}</span>}
            </span>

            <span className="np-meta">
              <span className="np-arrow" aria-hidden="true">
                →
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
