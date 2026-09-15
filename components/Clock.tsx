'use client'

import { useEffect, useRef } from 'react'

/**
 * 方案 A 表盘 —— 圆点刻度 + 圆头分层指针。
 *
 * 三个"精致"的来源：
 *   1. 刻度是圆点不是线段      —— 线段显廉价，圆点显克制
 *   2. 指针圆头且分层          —— 时粗短 / 分细长 / 秒最细，形成层次
 *   3. 秒针无端点圆珠          —— 一条干净的线
 *
 * 实现取舍：JS 只更新 SVG transform 属性。
 * 不用 CSS animation + 负 delay（那套在 SVG 上不可靠，之前踩过），
 * 也不用 rAF（持续开销）。250ms 一次 setState，肉眼足够平滑。
 */

const SIZE = 116
const CENTER = SIZE / 2
const R_TICK = CENTER - 8 // 刻度圆心所在半径
const TICK_BASE = 46 // 指针基准长度，实际长度 = BASE * 比例

export default function Clock() {
  const hourRef = useRef<SVGLineElement>(null)
  const minuteRef = useRef<SVGLineElement>(null)
  const secondRef = useRef<SVGLineElement>(null)

  useEffect(() => {
    function tick() {
      const now = new Date()
      const ms = now.getMilliseconds()
      const s = now.getSeconds() + ms / 1000
      const m = now.getMinutes() + s / 60
      const h = (now.getHours() % 12) + m / 60

      const unit = TICK_BASE / 3

      const setLine = (
        el: SVGLineElement | null,
        angle: number,
        len: number,
        tail = 0,
      ) => {
        if (!el) return
        const rad = (angle - 90) * (Math.PI / 180)
        const x2 = CENTER + Math.cos(rad) * len
        const y2 = CENTER + Math.sin(rad) * len
        const x1 = CENTER + Math.cos(rad + Math.PI) * tail
        const y1 = CENTER + Math.sin(rad + Math.PI) * tail
        el.setAttribute('x1', String(x1))
        el.setAttribute('y1', String(y1))
        el.setAttribute('x2', String(x2))
        el.setAttribute('y2', String(y2))
      }

      // 时针短、分针长、秒针最长最细；秒针带一点尾部配重，真实手表的标志
      setLine(hourRef.current, h * 30, unit * 2.1)
      setLine(minuteRef.current, m * 6, unit * 2.9)
      setLine(secondRef.current, s * 6, unit * 3.1, unit * 0.55)
    }

    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [])

  // 12 个刻度：整点用实心大点（major），其余小点
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 30 - 90) * (Math.PI / 180)
    return {
      cx: CENTER + Math.cos(angle) * R_TICK,
      cy: CENTER + Math.sin(angle) * R_TICK,
      major: i % 3 === 0,
    }
  })

  return (
    <svg
      className="clock"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width={SIZE}
      height={SIZE}
      aria-hidden="true"
    >
      <circle className="clock-face" cx={CENTER} cy={CENTER} r={CENTER - 1} />

      {ticks.map((t, i) => (
        <circle
          key={i}
          className={t.major ? 'clock-tick major' : 'clock-tick'}
          cx={t.cx}
          cy={t.cy}
          r={t.major ? 1.9 : 1.1}
        />
      ))}

      <line
        ref={hourRef}
        className="clock-hand clock-hand-hour"
        x1={CENTER}
        y1={CENTER}
        x2={CENTER}
        y2={CENTER - 30}
      />
      <line
        ref={minuteRef}
        className="clock-hand clock-hand-minute"
        x1={CENTER}
        y1={CENTER}
        x2={CENTER}
        y2={CENTER - 42}
      />
      <line
        ref={secondRef}
        className="clock-hand clock-hand-second"
        x1={CENTER}
        y1={CENTER}
        x2={CENTER}
        y2={CENTER - 46}
      />

      <circle className="clock-center" cx={CENTER} cy={CENTER} r={2.2} />
    </svg>
  )
}
