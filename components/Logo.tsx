/**
 * 左上角标志：栅格方框 + Y + 定位节点。
 *
 * 三处语义都来自站内已有的设计语言：
 *   - 方框 + 内部栅格线 = 页面背景网格（--grid）
 *   - Y = youngke 首字母，笔画把栅格线切断，制造层次
 *   - 交点圆点 = 定位节点，与页脚经纬度是同一套符号
 *
 * 纯 SVG + CSS，没有 JS：hover 时栅格横扫、节点放大，末端光标常驻闪烁。
 */
export default function Logo() {
  return (
    <span className="logo">
      <svg
        className="logo-mark"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        aria-hidden="true"
        focusable="false"
      >
        <rect
          className="logo-frame"
          x="2.75"
          y="2.75"
          width="18.5"
          height="18.5"
          rx="2"
        />

        <g className="logo-grid">
          <line x1="2.75" y1="8.6" x2="21.25" y2="8.6" />
          <line x1="2.75" y1="12" x2="21.25" y2="12" />
          <line x1="2.75" y1="15.4" x2="21.25" y2="15.4" />
        </g>

        {/* 底衬：用底色重描一遍 Y，把穿过的栅格线"擦断" */}
        <path className="logo-y-cut" d="M7.2 6.8 12 12l4.8-5.2M12 12v5.6" />
        <path className="logo-y" d="M7.2 6.8 12 12l4.8-5.2M12 12v5.6" />

        <circle className="logo-node" cx="12" cy="12" r="1.45" />
      </svg>

      <span className="logo-text">
        youngke
        <i className="logo-caret" aria-hidden="true" />
      </span>
    </span>
  )
}
