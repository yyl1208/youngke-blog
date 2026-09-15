export const metadata = {
  title: '关于 · 杨苛',
  description: '杨苛 · 全栈工程师 · 扬州',
}

const stacks = [
  { label: '前端', value: 'Vue2/3 · React · TypeScript · Vite · Webpack' },
  { label: '可视化', value: 'ECharts · D3 · antv-x6 · Leaflet · Turf' },
  { label: '后端', value: 'Java SpringBoot · Node · PostgreSQL · ClickHouse · MongoDB' },
  { label: 'AI', value: 'Dify · RAG · vibe coding' },
]

const contacts = [
  { label: 'Email', value: '1115383145@qq.com', href: 'mailto:1115383145@qq.com' },
  { label: 'GitHub', value: 'github.com', href: 'https://github.com/' },
]

export default function AboutPage() {
  return (
    <>
      <header className="page-head">
        <h1 className="page-title">关于</h1>
        <p className="page-desc">
          杨苛，全栈工程师，坐标扬州。前端 7 年，后端 2 年，主要在跟地图和可视化打交道。
        </p>
      </header>

      <section className="about-block">
        <h2>在做什么</h2>
        <p>
          过去几年做的事情比较杂：在一家互联网车企做车端地图编辑器，在一家半导体公司搭微前端脚手架和流程设计器，
          在网络安全创业公司负责攻击面管理模块，再早些在外企咨询给车企做物联网和大屏。
        </p>
        <p>
          共同点是都在跟"空间数据"和"可视化"打交道。地图编辑器、车辆实时监控、大屏看板，
          本质上都是把一堆抽象数据画成人能看懂的样子。
        </p>
        <p>
          这个站用来放两样东西：文章（想明白的事）和知识库（踩过的坑）。
          主要写给自己看，能帮到别人是意外之喜。
        </p>
      </section>

      <section className="about-block">
        <h2>技术栈</h2>
        <div className="row-list" style={{ borderTop: 'none' }}>
          {stacks.map((s) => (
            <div className="row-item" key={s.label}>
              <div className="row-link">
                <span className="row-date">{s.label}</span>
                <span className="row-title" style={{ fontSize: 'var(--fs-sm)' }}>
                  {s.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="about-block">
        <h2>找到我</h2>
        <div className="contact-grid">
          {contacts.map((c) => (
            <a
              key={c.label}
              className="contact-card"
              href={c.href}
              target={c.href.startsWith('http') ? '_blank' : undefined}
              rel={c.href.startsWith('http') ? 'noreferrer' : undefined}
            >
              <span className="contact-label">{c.label}</span>
              <span className="contact-value">{c.value}</span>
            </a>
          ))}
        </div>
      </section>
    </>
  )
}
