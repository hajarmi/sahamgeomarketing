import nextMdx from '@next/mdx'
import remarkGfm from 'remark-gfm'

const disableStrictChecks = (process.env.NEXT_DISABLE_STRICT ?? "").toLowerCase() === "true"
const allowUnoptimizedImages = (process.env.NEXT_IMAGE_UNOPTIMIZED ?? "").toLowerCase() === "true"

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  eslint: {
    ignoreDuringBuilds: disableStrictChecks,
  },
  typescript: {
    ignoreBuildErrors: disableStrictChecks,
  },
  images: {
    unoptimized: allowUnoptimizedImages,
  },
  productionBrowserSourceMaps: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  },
  experimental: {
    esmExternals: 'loose',
    mdxRs: true,
  },

  // ✅ ✅ ✅ Ajout du proxy API ici :
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/:path*', // FastAPI local
      },
    ]
  },
}

const withMdx = nextMdx({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [],
  },
})

export default withMdx(nextConfig)
