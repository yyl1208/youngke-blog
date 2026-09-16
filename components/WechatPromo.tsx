import { site, basePath } from '@/lib/site'

/**
 * 公众号二维码，只用在首页。不放推荐语，就一张码。
 *
 * 文案与图片路径都来自 lib/site.ts 的 site.wechat，改那里即可，不用动组件。
 */
export default function WechatPromo() {
  const w = site.wechat

  return (
    <div className="wechat">
      <img
        className="wechat-qr"
        src={`${basePath}${w.qr}`}
        alt={w.name ? `${w.name} 公众号二维码` : '公众号二维码'}
        width={84}
        height={84}
        loading="lazy"
      />
      {w.name && (
        <div className="wechat-body">
          <div className="wechat-name">{w.name}</div>
        </div>
      )}
    </div>
  )
}
