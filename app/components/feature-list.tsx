// app/components/feature-list.tsx
import Features from '@/app/descriptions/features.mdx'

export function FeatureList() {
  return (
    <div className="prose prose-invert max-w-none">
      <Features />
    </div>
  )
}
