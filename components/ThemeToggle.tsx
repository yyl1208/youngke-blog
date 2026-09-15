'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

/**
 * 主题切换：太阳 / 月亮两个图标交叉淡入旋转。
 *
 * 视觉状态完全由 CSS 的 [data-theme] 选择器驱动，不依赖 React state ——
 * 这样首屏在 hydration 之前就能显示正确的图标，不会闪一下。
 * React state 只用于 aria-label 和写 localStorage。
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme')
    setTheme(current === 'dark' ? 'dark' : 'light')
  }, [])

  function toggle() {
    const next: 'light' | 'dark' = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    try {
      localStorage.setItem('theme', next)
    } catch {
      // 隐私模式下 localStorage 可能不可用，忽略即可
    }
    setTheme(next)
  }

  const label = theme === 'dark' ? '切换到亮色' : '切换到暗色'

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={label}
      title={label}
    >
      <span className="theme-toggle-icons">
        <Sun className="icon icon-sun" size={15} strokeWidth={1.6} />
        <Moon className="icon icon-moon" size={15} strokeWidth={1.6} />
      </span>
    </button>
  )
}
