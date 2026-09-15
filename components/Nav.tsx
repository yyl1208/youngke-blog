'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: '主页' },
  { href: '/posts', label: '文章' },
  { href: '/knowledge', label: '知识库' },
  { href: '/journey', label: '经历' },
  { href: '/about', label: '关于' },
]

export default function Nav() {
  const pathname = usePathname()

  return (
    <nav className="site-nav">
      {links.map((link) => {
        const active =
          link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)

        return (
          <Link
            key={link.href}
            href={link.href}
            className={active ? 'nav-link is-active' : 'nav-link'}
            aria-current={active ? 'page' : undefined}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
