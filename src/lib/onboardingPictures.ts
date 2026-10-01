/* The onboarding pictures' files (see components/OnboardingPicture.tsx and scripts/onboarding-images.mjs). */

const WEB = import.meta.glob<string>('../../assets/onboarding/web/*.webp', { eager: true, import: 'default' })
const JPG = import.meta.glob<string>('../../assets/onboarding/*.jpg', { eager: true, import: 'default' })

export type OnboardingPictureName = 'banner_empire' | 'level_1' | 'level_2' | 'level_3' | 'level_4'

/** The originals' widths (the full-size WebP's too). */
export const PICTURE_WIDTH: Record<OnboardingPictureName, number> = { banner_empire: 1584, level_1: 1600, level_2: 1600, level_3: 1600, level_4: 1600 }

const url = (files: Record<string, string>, file: string) => Object.entries(files).find(([path]) => path.endsWith(`/${file}`))?.[1]

/** "a.webp 600w, b.webp 1200w, c.webp 1600w" (for the tests too). */
export function pictureSrcSet(name: OnboardingPictureName): string {
  return [
    [`${name}-600.webp`, 600],
    [`${name}-1200.webp`, 1200],
    [`${name}.webp`, PICTURE_WIDTH[name]],
  ]
    .map(([file, w]) => `${url(WEB, file as string)} ${w}w`)
    .join(', ')
}

export function pictureFallback(name: OnboardingPictureName): string | undefined {
  return url(JPG, `${name}.jpg`)
}
