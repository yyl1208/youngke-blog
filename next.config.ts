import type { NextConfig } from 'next'
import { basePath } from './lib/site'

const nextConfig: NextConfig = {
  // 纯静态导出：构建产物在 out/，可直接丢到 GitHub Pages / 任意静态托管
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
  // 仓库不是 <user>.github.io，站点挂在子路径下，资源必须带前缀
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
}

export default nextConfig
