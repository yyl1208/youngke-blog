'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export interface SearchItem {
  type: string
  title: string
  href: string
  desc: string
}

/**
 * 客户端搜索：数据量小（几十条），直接 includes 过滤，不引入 Fuse/Pagefind。
 * 索引由服务端构建时生成，通过 props 传入。
 */
export default function SearchBox({ items }: { items: SearchItem[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return items
      .filter(
        (it) =>
          it.title.toLowerCase().includes(q) ||
          it.desc.toLowerCase().includes(q) ||
          it.type.toLowerCase().includes(q),
      )
      .slice(0, 6)
  }, [query, items])

  // ⌘K / Ctrl+K 聚焦
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // 点击外部关闭
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function go(href: string) {
    setOpen(false)
    setQuery('')
    inputRef.current?.blur()
    router.push(href)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (results[active]) go(results[active].href)
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div className="search" ref={boxRef}>
      <svg
        className="search-icon"
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1" />
        <path d="M7.8 7.8 11 11" stroke="currentColor" strokeWidth="1" />
      </svg>

      <input
        ref={inputRef}
        className="search-input"
        type="text"
        placeholder="搜索"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        aria-label="搜索文章与知识库"
      />

      {!query && <kbd className="search-kbd">⌘K</kbd>}

      {open && query.trim() !== '' && (
        <div className="search-panel">
          {results.length === 0 && <div className="search-empty">没有找到</div>}
          {results.map((it, i) => (
            <button
              key={it.href}
              type="button"
              className={i === active ? 'search-item is-active' : 'search-item'}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(it.href)}
            >
              <span className="search-type">{it.type}</span>
              <span className="search-title">{it.title}</span>
              <span className="search-desc">{it.desc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
