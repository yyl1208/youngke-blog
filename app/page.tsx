import Link from 'next/link'
import { getAllPosts } from '@/lib/posts'
import { getAllKnowledge } from '@/lib/knowledge'
import { journey } from '@/lib/journey'

export default function Home() {
  const posts = getAllPosts().slice(0, 4)
  const knowledge = getAllKnowledge().slice(0, 4)

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
          全栈工程师，坐标扬州。前端 7 年，后端 2 年，一直在跟地图和可视化打交道。
          这个站主要写给自己看——把做过的东西和踩过的坑留下来，免得下次再踩一遍。
        </p>
      </section>

      {/* ---------- 01 最近写的 ---------- */}
      <section className="section">
        <div className="section-head">
          <span className="section-num">01</span>
          <span className="section-title">Recent Writing</span>
          <span className="section-title-zh">最近写的</span>
        </div>

        {posts.length === 0 ? (
          <p className="empty-note">
            还没有文章。在 <code className="code-inline">content/posts/</code>{' '}
            里新建一个 .md 就会出现在这里。
          </p>
        ) : (
          <ul className="item-list">
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
          </ul>
        )}
      </section>

      {/* ---------- 02 最近记的 ---------- */}
      <section className="section">
        <div className="section-head">
          <span className="section-num">02</span>
          <span className="section-title">Knowledge Base</span>
          <span className="section-title-zh">最近记的</span>
        </div>

        {knowledge.length === 0 ? (
          <p className="empty-note">还没有条目。</p>
        ) : (
          <ul className="item-list">
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
          </ul>
        )}
      </section>

      {/* ---------- 03 经历（简版） ---------- */}
      <section className="section">
        <div className="section-head">
          <span className="section-num">03</span>
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

      {/* ---------- 04 板块 ---------- */}
      <section className="section">
        <div className="section-head">
          <span className="section-num">04</span>
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
