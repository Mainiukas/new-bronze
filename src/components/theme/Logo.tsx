import iconUrl from '../../../assets/logo/bronze_icon.svg'
import stackedUrl from '../../../assets/logo/bronze_logo_stacked.svg'
import wordmarkUrl from '../../../assets/logo/bronze_wordmark.svg'
import taglineUrl from '../../../assets/logo/bronze_wordmark_tagline.svg'

/** The logo files (assets/logo) and their drawing sizes, so the layout is reserved before they load. */
const LOGOS = {
  /** "BRONZE" */
  wordmark: { src: wordmarkUrl, width: 1100, height: 240 },
  /** "BRONZE" over "Build · Connect · Industrialize" */
  tagline: { src: taglineUrl, width: 1100, height: 300 },
  /** The cog emblem over the name and tagline */
  stacked: { src: stackedUrl, width: 1000, height: 900 },
  /** The cog "B" */
  icon: { src: iconUrl, width: 512, height: 512 },
} as const

export type LogoVariant = keyof typeof LOGOS

/** A Bronze logo. Size it with a width class; the height follows. */
export function Logo({ variant, className = '' }: { variant: LogoVariant; className?: string }) {
  const { src, width, height } = LOGOS[variant]
  return <img src={src} alt="Bronze" width={width} height={height} draggable={false} className={`block h-auto max-w-full ${className}`} />
}

/**
 * The account screens' logo: the stacked emblem, or the one-line wordmark
 * with its tagline on short screens (under 700 px), where the emblem would
 * push the form too far down.
 */
export function AuthLogo({ className = '' }: { className?: string }) {
  return (
    <picture className={`block ${className}`}>
      <source media="(max-height: 699px)" srcSet={taglineUrl} width={LOGOS.tagline.width} height={LOGOS.tagline.height} />
      <img
        src={stackedUrl}
        alt="Bronze"
        width={LOGOS.stacked.width}
        height={LOGOS.stacked.height}
        draggable={false}
        className="mx-auto block h-auto w-[200px] md:w-[280px]"
      />
    </picture>
  )
}
