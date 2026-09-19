import { getQuoteForSlug } from '@/lib/quotes'

/**
 * 文章正文末尾的一句话。
 *
 * 语录不在文章里写，统一由 content/quotes.md 管；组件只负责挑一条渲染。
 * 这样加一句不用动任何一篇文章，删掉文件也只是不显示（不会构建失败）。
 *
 * 现在是纯文字版：服务端组件，文字在构建期就渲染进 HTML。
 * 粒子层已经写好在 components/QuoteSand.tsx，等这版样式定下来再接回来——
 * 接的时候只需要把 blockquote 里的内容换回 <QuoteSand text={...} />。
 */
export default function ClosingQuote({ slug }: { slug: string }) {
  const quote = getQuoteForSlug(slug)
  if (!quote) return null

  return (
    <figure className="closing-quote">
      <blockquote className="cq-text">{quote.text}</blockquote>
      {quote.author && <figcaption className="cq-author">{quote.author}</figcaption>}
    </figure>
  )
}
