/**
 * template.tsx 在每次导航时都会重新挂载（layout.tsx 不会），
 * 所以进场动画放在这里最合适 —— 零依赖、不需要路由监听。
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>
}
