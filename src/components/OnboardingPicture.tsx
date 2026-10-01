/**
 * An onboarding picture (assets/onboarding) as <picture>: WebP at 600, 1200
 * and full width (made by scripts/onboarding-images.mjs) for the browser to
 * pick from by `sizes`, the original JPEG as the fallback.
 */

import { pictureFallback, pictureSrcSet, type OnboardingPictureName } from '../lib/onboardingPictures'

export function OnboardingPicture({ name, alt, sizes, className }: { name: OnboardingPictureName; alt: string; sizes: string; className?: string }) {
  return (
    <picture>
      <source type="image/webp" srcSet={pictureSrcSet(name)} sizes={sizes} />
      <img src={pictureFallback(name)} alt={alt} sizes={sizes} decoding="async" draggable={false} className={className} />
    </picture>
  )
}
