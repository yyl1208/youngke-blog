'use client'

import { useEffect, useState } from 'react'

/**
 * 全宽 sticky 顶栏。
 * 未滚动时无边框（融入页面），滚动超过 8px 后加底部分割线 —— 这样首屏更干净。
 */
export default function Header({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={scrolled ? 'site-header is-scrolled' : 'site-header'}>
      {children}
    </header>
  )
}
