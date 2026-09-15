'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: '主页' },
  { href: '/posts', label: '文章' },
  { href: '/knowledge', label: '知识库' },
  { href: '/journey', label: '经历' },
  { href: '/about', label: '关于' },
]

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

/**
 * 导航有两种形态，靠 CSS 切换而不是 JS 判断屏幕宽度：
 * - 宽屏：行内链接（.site-nav）
 * - ≤720px：收进汉堡按钮，展开后从顶栏下拉出整幅面板（.mobile-nav）
 *
 * 面板绝对定位到 .site-header 上（它是 sticky，属于定位元素），
 * 所以能铺满整屏宽度，不被 .header-inner 的最大宽度和内边距限制。
 */
export default function Nav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // 路由变化后自动收起 —— 点链接跳转时不用手动关
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Esc 关闭
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <nav className="site-nav">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={isActive(pathname, link.href) ? 'nav-link is-active' : 'nav-link'}
            aria-current={isActive(pathname, link.href) ? 'page' : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <button
        type="button"
        className="menu-btn"
        aria-label={open ? '关闭菜单' : '打开菜单'}
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="menu-bar" />
        <span className="menu-bar" />
      </button>

      {/* 点空白处关闭：整屏透明遮罩，z-index 为负所以压在面板下面 */}
      {open && (
        <button
          type="button"
          className="mn-backdrop"
          aria-label="关闭菜单"
          tabIndex={-1}
          onClick={() => setOpen(false)}
        />
      )}

      {open && (
        <nav className="mobile-nav" id="mobile-nav">
          {links.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                isActive(pathname, link.href) ? 'mn-link is-active' : 'mn-link'
              }
              aria-current={isActive(pathname, link.href) ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              <span className="mn-index tnum">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="mn-label">{link.label}</span>
              <span className="mn-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          ))}
        </nav>
      )}
    </>
  )
}
