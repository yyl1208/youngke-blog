import { nowTracks } from '@/lib/now'

/**
 * 首页 Now 区块里的三条主线。
 *
 * 记录模式：每条就是一个「什么时候，做了什么」，往下追加即可。
 * 不统计百分比，也不显示完成度——进度这东西填不准就全是自欺欺人。
 * 内容全在 lib/now.ts，加一条主线不用碰这个组件。
 *
 * 服务端组件，构建期就定死了。
 */
export default function NowTracks() {
  return (
    <div className="now-tracks">
      {nowTracks.map((t) => (
        <article key={t.id} className="np-item">
          <div className="np-head">
            <h3 className="np-title">{t.title}</h3>
            <span className="np-period tnum">{t.period}</span>
          </div>

          <p className="np-desc">{t.desc}</p>

          <ol className="np-list">
            {t.entries.map((e) => (
              <li
                key={e.date + e.text}
                className={e.done === false ? 'np-entry' : 'np-entry is-done'}
              >
                <i className="np-dot" aria-hidden="true" />
                <span className="np-date tnum">{e.date}</span>
                <span className="np-text">{e.text}</span>
              </li>
            ))}
          </ol>
        </article>
      ))}
    </div>
  )
}
