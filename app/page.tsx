import Link from 'next/link'
import RevealList from '@/components/RevealList'
import { getAllPosts } from '@/lib/posts'
import { getAllKnowledge } from '@/lib/knowledge'
import { journey } from '@/lib/journey'
import { site } from '@/lib/site'

/** 「现在在做」的流向：手上的东西 → 落到站里哪个地方 */
const flow = [
  { from: '项目复盘', to: '文章', href: '/posts/' },
  { from: '踩坑记录', to: '知识库', href: '/knowledge/' },
  { from: '能工具化的', to: '开源', href: site.github },
]

export default function Home() {
  const posts = getAllPosts()
  const knowledge = getAllKnowledge()

  const entries = [
    {
      href: '/posts',
      title: '文章',
      desc: '写给自己看的笔记，偶尔值得被人看见',
    },
    {
      href: '/knowledge',
      title: '知识库',
      desc: '从项目里捞出来的踩坑记录和解法',
    },
    {
      href: '/journey',
      title: '经历',
      desc: '做过的事、待过的公司、踩过的坑',
    },
    {
      href: '/about',
      title: '关于',
      desc: '我是谁，以及怎么找到我',
    },
  ]

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="hero">
        <p className="hero-greeting">Hi，我是</p>
        <h1 className="hero-name">杨苛</h1>

        <p className="hero-line">
          用 <span className="mark">AI</span> 不断拓展自己的能力边界
        </p>

        <p className="hero-sub">
          全栈工程师，当前坐标扬州。
          <br />
          正在努力成为一个独立开发者、开源贡献者和技术博主。
        </p>
      </section>

      {/* ---------- 01 现在在做 ---------- */}
      <section className="section">
        <div className="section-head">
          <span className="section-num">01</span>
          <span className="section-title">Now</span>
          <span className="now-badge">
            <i className="now-dot" aria-hidden="true" />
            进行中
          </span>
          <span className="section-title-zh">现在在做</span>
        </div>

        <p className="now-line">把手上的工作重新翻一遍，挑出值得留下来的那部分。</p>

        <p className="now-desc">
          过去几年攒下的项目、踩过的坑、想明白的方案，正在从「做完了」变成「写下来」。
        </p>

        <div className="now-flow">
          {flow.map((f) => (
            <Link
              key={f.to}
              href={f.href}
              className="flow-item"
              {...(f.href.startsWith('http')
                ? { target: '_blank', rel: 'noreferrer' }
                : {})}
            >
              <span className="flow-from">{f.from}</span>
              <span className="flow-to">
                <span className="flow-arrow" aria-hidden="true">
                  →
                </span>
                {f.to}
              </span>
            </Link>
          ))}
        </div>

        <p className="now-meta tnum">更新于 2026.09</p>
      </section>

      {/* ---------- 02 最近写的 ---------- */}
      <section className="section">
        <div className="section-head">
          <span className="section-num">02</span>
          <span className="section-title">Recent Writing</span>
          <span className="section-title-zh">最近写的</span>
        </div>

        {posts.length === 0 ? (
          <p className="empty-note">
            还没有文章。在 <code className="code-inline">content/posts/</code>{' '}
            里新建一个 .md 就会出现在这里。
          </p>
        ) : (
          <>
            {/* 全量交给客户端组件切片，默认只露 5 篇，多了才出现「展开更多」 */}
            <RevealList initial={5} step={5} unit="篇">
              {posts.map((post) => (
                <li key={post.slug}>
                  <Link href={`/posts/${post.slug}/`} className="card-link">
                    <div>
                      <span className="card-title">{post.title}</span>
                      <div className="card-tags">
                        {post.tags.map((tag) => (
                          <span key={tag} className="tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="card-side">
                      {post.date}
                      <br />
                      {post.minutes} 分钟
                    </span>
                  </Link>
                </li>
              ))}
            </RevealList>

            <div className="section-more">
              <span className="tnum">共 {posts.length} 篇</span>
              <Link href="/posts/">全部文章 →</Link>
            </div>
          </>
        )}
      </section>

      {/* ---------- 03 最近记的 ---------- */}
      <section className="section">
        <div className="section-head">
          <span className="section-num">03</span>
          <span className="section-title">Knowledge Base</span>
          <span className="section-title-zh">最近记的</span>
        </div>

        {knowledge.length === 0 ? (
          <p className="empty-note">还没有条目。</p>
        ) : (
          <>
            <RevealList initial={4} step={4} unit="条">
              {knowledge.map((k) => (
                <li key={k.slug}>
                  <Link href={`/knowledge/${k.slug}/`} className="card-link">
                    <div>
                      <span className="card-title">{k.title}</span>
                      <p className="card-desc">
                        {k.project ? `${k.project} · ` : ''}
                        {k.domain}
                      </p>
                    </div>
                    <span className="card-side">{k.date}</span>
                  </Link>
                </li>
              ))}
            </RevealList>

            <div className="section-more">
              <span className="tnum">共 {knowledge.length} 条</span>
              <Link href="/knowledge/">全部条目 →</Link>
            </div>
          </>
        )}
      </section>

      {/* ---------- 04 经历（简版） ---------- */}
      <section className="section">
        <div className="section-head">
          <span className="section-num">04</span>
          <span className="section-title">Experience</span>
          <span className="section-title-zh">走到现在</span>
        </div>

        <p className="section-note">
          2018 年入行，一路从外包交付做到车端地图。下面是简版，
          <Link href="/journey/" className="link-inline">
            完整经历
          </Link>
          里有每个项目的角色和技术栈。
        </p>

        <ul className="exp-list">
          {journey.map((job) => (
            <li key={job.company}>
              <Link href="/journey/" className="exp-item">
                <span className="exp-period tnum">{job.period}</span>
                <div>
                  <div className="exp-head">
                    <span className="exp-company">{job.company}</span>
                    <span className="exp-title">{job.title}</span>
                  </div>
                  <p className="exp-note">{job.note}</p>
                </div>
                <span className="exp-count tnum">
                  {job.projects.length} 个项目
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- 05 板块 ---------- */}
      <section className="section">
        <div className="section-head">
          <span className="section-num">05</span>
          <span className="section-title">Sections</span>
          <span className="section-title-zh">到处走走</span>
        </div>

        <div className="grid-2">
          {entries.map((e) => (
            <Link key={e.href} href={e.href} className="card-link">
              <div>
                <span className="card-title">{e.title}</span>
                <p className="card-desc">{e.desc}</p>
              </div>
              <span className="card-side">→</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
