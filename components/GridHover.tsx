'use client'

import { useEffect } from 'react'

/**
 * 背景网格的鼠标跟随。
 *
 * 只做一件事：把鼠标坐标写进 `--mx / --my`，再控制一个 `--grid-glow` 的强弱。
 * 真正的绘制在 CSS 的 body::before（一层被 radial-gradient 遮罩的深色网格）里，
 * 这样每帧只改两个变量，不碰 DOM。
 *
 * 触屏设备（没有 hover）和系统开了「减少动态效果」时完全不启用。
 */
export default function GridHover() {
  useEffect(() => {
    const canHover = window.matchMedia('(hover: hover)').matches
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!canHover || reduceMotion) return

    const root = document.documentElement
    let frame = 0
    let idleTimer = 0

    const setGlow = (value: string) => root.style.setProperty('--grid-glow', value)

    const onMove = (event: MouseEvent) => {
      const { clientX: x, clientY: y } = event
      if (frame) return

      frame = requestAnimationFrame(() => {
        frame = 0
        root.style.setProperty('--mx', `${x}px`)
        root.style.setProperty('--my', `${y}px`)
        setGlow('1')

        // 停下不动就慢慢淡下去，鼠标再动立刻回来
        window.clearTimeout(idleTimer)
        idleTimer = window.setTimeout(() => setGlow('0.4'), 1400)
      })
    }

    /** 鼠标移出窗口就整层收掉 */
    const onLeave = () => {
      window.clearTimeout(idleTimer)
      setGlow('0')
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseleave', onLeave)

    return () => {
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      if (frame) cancelAnimationFrame(frame)
      window.clearTimeout(idleTimer)
      root.style.removeProperty('--mx')
      root.style.removeProperty('--my')
      root.style.removeProperty('--grid-glow')
    }
  }, [])

  return null
}
