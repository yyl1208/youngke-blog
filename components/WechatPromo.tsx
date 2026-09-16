import { site, basePath } from '@/lib/site'

/**
 * 公众号推荐位。
 *
 * - `bar`：文章底部的一条窄条，不打断阅读，扫一眼就过
 * - `card`：关于页的卡片，二维码大一号
 *
 * 内容全部来自 lib/site.ts 的 site.wechat，改那里即可，不用动组件。
 */
export default function WechatPromo({ variant = 'bar' }: { variant?: 'bar' | 'card' }) {
  const w = site.wechat
  if (!w) return null

  return (
    <aside className={`wechat wechat-${variant}`}>
      <img
        className="wechat-qr"
        src={`${basePath}${w.qr}`}
        alt={w.name ? `${w.name} 公众号二维码` : '公众号二维码'}
        width={variant === 'card' ? 132 : 84}
        height={variant === 'card' ? 132 : 84}
        loading="lazy"
      />
      <div className="wechat-body">
        {variant === 'card' && <div className="wechat-label">公众号</div>}
        {w.name && <div className="wechat-name">{w.name}</div>}
        <p className="wechat-desc">{w.desc}</p>
      </div>
    </aside>
  )
}
