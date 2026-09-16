import type { Metadata } from 'next'
import { changelog } from '@/lib/changelog'

export const metadata: Metadata = {
  title: '更新日志 · 杨苛',
  description: '这个站的改动记录',
}

export default function ChangelogPage() {
  return (
    <>
      <header className="page-head">
        <h1 className="page-title">更新日志</h1>
        <p className="page-desc">
          这个站每次动过哪里，都记在这里。不是版本发布，只是留个痕迹——
          过几个月回看，能知道自己到底折腾了什么。
        </p>
      </header>

      <section className="section">
        <ul className="row-list">
          {changelog.map((entry) => (
            <li className="row-item" key={entry.date}>
              <div className="row-link">
                <span className="row-date">{entry.date}</span>
                <span className="row-title">
                  <strong className="change-title">{entry.title}</strong>
                  <ul className="change-items">
                    {entry.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
