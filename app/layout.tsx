import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import Nav from '@/components/Nav'
import { GithubIcon } from '@/components/icons'
import Header from '@/components/Header'
import GridHover from '@/components/GridHover'
import Logo from '@/components/Logo'
import ThemeToggle from '@/components/ThemeToggle'
import SearchBox, { type SearchItem } from '@/components/SearchBox'
import { getAllPosts } from '@/lib/posts'
import { getAllKnowledge } from '@/lib/knowledge'
import { site, basePath } from '@/lib/site'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: site.name,
    template: '%s',
  },
  description: site.description,
  authors: [{ name: site.name }],
}

/** 浏览器 UI（地址栏 / 标签页）配色，跟随系统深浅 */
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

// 在样式生效前确定主题，避免首屏闪白
const themeScript = `
(function(){
  try{
    var t = localStorage.getItem('theme');
    if(!t){
      t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', t);
  }catch(e){}
})();
`

/** 构建时生成搜索索引：数据量小，直接传给客户端组件 */
function buildSearchIndex(): SearchItem[] {
  const posts = getAllPosts().map((p) => ({
    type: '文章',
    title: p.title,
    href: `/posts/${p.slug}/`,
    desc: p.tags.join(' ') || p.date,
  }))

  const knowledge = getAllKnowledge().map((k) => ({
    type: '知识',
    title: k.title,
    href: `/knowledge/${k.slug}/`,
    desc: `${k.domain} ${k.project}`,
  }))

  return [...posts, ...knowledge]
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const searchItems = buildSearchIndex()

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {/* 背景网格的鼠标跟随，只在有鼠标的设备上启用 */}
        <GridHover />

        <Header>
          <div className="header-inner">
            <Link href="/" className="logo-link" aria-label={`${site.name} · 首页`}>
              <Logo />
            </Link>

            <SearchBox items={searchItems} />

            <div className="header-right">
              <Nav />

              <div className="header-icons">
                <a
                  className="icon-btn"
                  href={site.github}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="GitHub"
                  title="GitHub"
                >
                  <GithubIcon size={15} />
                </a>

                <ThemeToggle />
              </div>
            </div>
          </div>
        </Header>

        <div className="wrap">
          <main className="site-main">{children}</main>

          <footer className="site-footer">
            <div className="footer-meta">
              <span className="coord">
                <span className="coord-line">32.3942 N</span>
                <span className="coord-line">119.4238 E</span>
              </span>
              <span className="scale-bar">50 km</span>
            </div>

            <div className="footer-links">
              <a href={site.github} target="_blank" rel="noreferrer">
                github
              </a>
              <a href={`mailto:${site.email}`}>email</a>
              <a href={`${basePath}/rss.xml`}>rss</a>
              <Link href="/changelog/">更新日志</Link>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
