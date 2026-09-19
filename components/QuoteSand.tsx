'use client'

import { useEffect, useRef } from 'react'

interface Particle {
  ox: number
  oy: number
  x: number
  y: number
  vx: number
  vy: number
}

/** 采样步长：越小颗粒越密、字越清晰，代价是粒子更多 */
const STEP = 3
/** 鼠标影响半径 */
const RADIUS = 46
/** 最大推开距离——克制是重点，这个数一大就变成马戏团 */
const PUSH = 3.2
const SPRING = 0.11
const FRICTION = 0.76

/**
 * 语录文字的「流沙」层。
 *
 * 原理：离屏 canvas 把同样的文字画一遍，读像素、按步长取点，得到一堆粒子；
 * 平时粒子就停在原位（看起来就是正常的字），鼠标靠近才被轻轻推开、离开后弹回。
 *
 * 三条底线：
 *   1. 纯 Canvas 2D，零依赖，不引任何动画库
 *   2. 文字仍然在 DOM 里（视觉透明但可读屏、可被搜索），canvas 只是视觉层
 *   3. 触屏、prefers-reduced-motion、以及没启用时，就是一句普通文字
 */
export default function QuoteSand({ text }: { text: string }) {
  const wrapRef = useRef<HTMLSpanElement>(null)
  const srcRef = useRef<HTMLSpanElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const src = srcRef.current
    const canvas = canvasRef.current
    if (!wrap || !src || !canvas) return

    // 触屏没有 hover，别白跑；用户要求减少动效时更是直接不动
    if (!window.matchMedia('(hover: hover)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let ps: Particle[] = []
    let raf = 0
    let running = false
    let px = -9999
    let py = -9999
    let color = '#000'

    const readColor = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--fg').trim()
      color = v || '#000'
    }

    /**
     * 贪心折行：中文逐字断、英文按空格断。
     * 浏览器实际怎么折我们拿不到，只能尽量逼近——差半行不影响观感，
     * 因为粒子是按像素采的，不是按字符摆的。
     */
    const wrapLines = (font: string, maxW: number): string[] => {
      const c = document.createElement('canvas').getContext('2d')
      if (!c) return [text]
      c.font = font

      const tokens: string[] = []
      let buf = ''
      for (const ch of text) {
        if (ch === ' ') {
          if (buf) tokens.push(buf)
          buf = ''
          tokens.push(' ')
          continue
        }
        if (/[\u3000-\u303f\u4e00-\u9fa5\uff00-\uffef]/.test(ch)) {
          if (buf) tokens.push(buf)
          buf = ''
          tokens.push(ch)
        } else {
          buf += ch
        }
      }
      if (buf) tokens.push(buf)

      const lines: string[] = []
      let cur = ''
      for (const t of tokens) {
        const test = cur + t
        if (cur && c.measureText(test).width > maxW) {
          lines.push(cur)
          cur = t === ' ' ? '' : t
        } else {
          cur = test
        }
      }
      if (cur) lines.push(cur)
      return lines
    }

    const draw = () => {
      const w = canvas.width / dpr
      const h = canvas.height / dpr
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = color
      for (const p of ps) ctx.fillRect(p.x, p.y, 1.2, 1.2)
    }

    const loop = () => {
      const w = canvas.width / dpr
      const h = canvas.height / dpr
      let moving = false

      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = color

      for (const p of ps) {
        let tx = p.ox
        let ty = p.oy

        const dx = p.ox - px
        const dy = p.oy - py
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d < RADIUS) {
          const f = (1 - d / RADIUS) * PUSH
          tx += (dx / (d || 1)) * f
          ty += (dy / (d || 1)) * f
        }

        p.vx = (p.vx + (tx - p.x) * SPRING) * FRICTION
        p.vy = (p.vy + (ty - p.y) * SPRING) * FRICTION
        p.x += p.vx
        p.y += p.vy

        if (Math.abs(p.vx) > 0.01 || Math.abs(p.vy) > 0.01) moving = true
        ctx.fillRect(p.x, p.y, 1.2, 1.2)
      }

      if (moving) {
        raf = requestAnimationFrame(loop)
      } else {
        running = false
      }
    }

    const start = () => {
      if (running) return
      running = true
      raf = requestAnimationFrame(loop)
    }

    const build = () => {
      const rect = src.getBoundingClientRect()
      const w = Math.ceil(rect.width)
      const h = Math.ceil(rect.height)
      if (!w || !h) return

      canvas.width = Math.ceil(w * dpr)
      canvas.height = Math.ceil(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const style = getComputedStyle(src)
      const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      const lh = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.9

      const off = document.createElement('canvas')
      off.width = w
      off.height = h
      const octx = off.getContext('2d', { willReadFrequently: true })
      if (!octx) return

      octx.font = font
      octx.fillStyle = '#000'
      octx.textBaseline = 'alphabetic'

      wrapLines(font, w).forEach((line, i) => {
        octx.fillText(line, 0, lh * (i + 0.76))
      })

      const data = octx.getImageData(0, 0, w, h).data
      ps = []
      for (let y = 0; y < h; y += STEP) {
        for (let x = 0; x < w; x += STEP) {
          if (data[(y * w + x) * 4 + 3] > 140) {
            ps.push({ ox: x, oy: y, x, y, vx: 0, vy: 0 })
          }
        }
      }

      readColor()
      wrap.classList.add('is-live')
      draw()
    }

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      px = e.clientX - r.left
      py = e.clientY - r.top
      start()
    }

    const onLeave = () => {
      px = -9999
      py = -9999
      start()
    }

    build()

    wrap.addEventListener('pointermove', onMove)
    wrap.addEventListener('pointerleave', onLeave)

    const ro = new ResizeObserver(() => {
      wrap.classList.remove('is-live')
      build()
    })
    ro.observe(src)

    // 主题切换后 --fg 变了，重取颜色再画一次
    const mo = new MutationObserver(() => {
      readColor()
      draw()
    })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    return () => {
      cancelAnimationFrame(raf)
      wrap.removeEventListener('pointermove', onMove)
      wrap.removeEventListener('pointerleave', onLeave)
      ro.disconnect()
      mo.disconnect()
    }
  }, [text])

  return (
    <span className="qs" ref={wrapRef}>
      {/* 真实文字留在 DOM 里：读屏和站内搜索都靠它，启用 canvas 后才透明 */}
      <span className="qs-text" ref={srcRef}>
        {text}
      </span>
      <canvas className="qs-canvas" ref={canvasRef} aria-hidden="true" />
    </span>
  )
}
