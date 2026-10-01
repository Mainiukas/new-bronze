import type { ReactNode, SVGProps } from 'react'

/**
 * Line icons drawn for Bronze. All use currentColor, so they pick up the
 * surrounding text color, and are hidden from screen readers by default
 * (the button or label next to them carries the accessible name).
 */

export type IconProps = SVGProps<SVGSVGElement>

function Svg({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export function IconClose(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  )
}

export function IconCheck(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </Svg>
  )
}

export function IconArrowLeft(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </Svg>
  )
}

export function IconMap(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 4.5 3.5 6.5v13L9 17.5l6 2 5.5-2v-13L15 6.5z" />
      <path d="M9 4.5v13M15 6.5v13" />
    </Svg>
  )
}

export function IconChevronDown(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 9l6 6 6-6" />
    </Svg>
  )
}

export function IconClock(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Svg>
  )
}

export function IconUsers(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3 19.5c0-3.3 2.7-5.6 6-5.6s6 2.3 6 5.6" />
      <circle cx="17" cy="9.5" r="2.4" />
      <path d="M16.6 14c2.5.3 4.4 2.3 4.4 5" />
    </Svg>
  )
}

export function IconCog(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10.3 3h3.4l.6 2.4 1.9.8 2.1-1.3 2.4 2.4-1.3 2.1.8 1.9 2.4.6v3.4l-2.4.6-.8 1.9 1.3 2.1-2.4 2.4-2.1-1.3-1.9.8-.6 2.4h-3.4l-.6-2.4-1.9-.8-2.1 1.3-2.4-2.4 1.3-2.1-.8-1.9L2.8 13.7v-3.4l2.4-.6.8-1.9-1.3-2.1 2.4-2.4 2.1 1.3 1.9-.8z" />
      <circle cx="12" cy="12" r="3.2" />
    </Svg>
  )
}

export function IconBook(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 6.5C10.5 5 8.2 4.5 4 4.5v13.5c4.2 0 6.5.5 8 2 1.5-1.5 3.8-2 8-2V4.5c-4.2 0-6.5.5-8 2zM12 6.5V20" />
    </Svg>
  )
}

export function IconStar(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5l2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.4l-5.1 2.8L8 13.5l-4.3-4 5.8-.7z" />
    </Svg>
  )
}

export function IconPlay(props: IconProps) {
  return (
    <Svg fill="currentColor" stroke="none" {...props}>
      <path d="M8 5.2v13.6a.8.8 0 001.2.7l10.6-6.8a.8.8 0 000-1.4L9.2 4.5A.8.8 0 008 5.2z" />
    </Svg>
  )
}

/* ---- Game mode icons ---------------------------------------------------- */

export function IconFactory(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 20.5h18V3.5h-3.5v9L13 9.5v3L8 9.5v3L3 9.5z" />
      <path d="M6.5 16.5h2M11 16.5h2M15.5 16.5h2" />
    </Svg>
  )
}

export function IconBolt(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M13.5 2.5L5 13.5h6l-1 8 8.5-11h-6z" />
    </Svg>
  )
}

export function IconStopwatch(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 13.5V9.5M9.5 2.5h5M12 2.5V6M18.3 6.8l1.5-1.5" />
    </Svg>
  )
}

/* ---- Navigation icons --------------------------------------------------- */

export function IconHome(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 11 12 4l8.5 7" />
      <path d="M6 9.5V20h4.5v-5.5h3V20H18V9.5" />
    </Svg>
  )
}

export function IconMore(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="5.5" cy="12" r="1.3" fill="currentColor" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
      <circle cx="18.5" cy="12" r="1.3" fill="currentColor" />
    </Svg>
  )
}

export function IconLogout(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14 4.5H6.5v15H14" />
      <path d="M10.5 12h10M17 8.5l3.5 3.5-3.5 3.5" />
    </Svg>
  )
}

export function IconUserPlus(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="10" cy="8.5" r="3.4" />
      <path d="M3.5 19.5c0-3.4 2.9-5.8 6.5-5.8 1.4 0 2.7.4 3.8 1" />
      <path d="M18 13.5v6M15 16.5h6" />
    </Svg>
  )
}

export function IconComputer(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="4.5" width="17" height="11.5" rx="1.5" />
      <path d="M9 20h6M12 16v4" />
    </Svg>
  )
}

export function IconGlobe(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.2 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.2-3.6-8.5s1.2-6.2 3.6-8.5z" />
    </Svg>
  )
}

export function IconLock(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8.5 10.5V7.5a3.5 3.5 0 017 0v3" />
    </Svg>
  )
}

export function IconLogin(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 4.5h7.5v15H10" />
      <path d="M3.5 12h10M10 8.5l3.5 3.5-3.5 3.5" />
    </Svg>
  )
}

export function IconEye(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  )
}

export function IconEyeOff(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9.9 5.8A9.6 9.6 0 0112 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 01-2.7 3.4M6.5 7.4C4 9 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.7 0 3.2-.5 4.5-1.2" />
      <path d="M9.9 9.9a3 3 0 004.2 4.2M3.5 3.5l17 17" />
    </Svg>
  )
}

/** Google's "G", in its own colours (Google's sign-in branding rules). */
export function IconGoogle(props: IconProps) {
  return (
    <svg viewBox="0 0 48 48" width="1em" height="1em" aria-hidden="true" focusable="false" {...props}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

/* ---- Tab icons ---------------------------------------------------------- */

export function IconTopHat(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 17V6.5C7 5.1 9.2 4 12 4s5 1.1 5 2.5V17" />
      <path d="M7 13.5c1.4.6 3.1 1 5 1s3.6-.4 5-1" />
      <path d="M3 17.5c2 1.3 5 2 9 2s7-.7 9-2" />
    </Svg>
  )
}

export function IconCrate(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z" />
      <path d="M3.5 7.5L12 12l8.5-4.5M12 12v9M7.8 5.3l8.4 4.5" />
    </Svg>
  )
}

export function IconTrophy(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 4h8v5a4 4 0 01-8 0z" />
      <path d="M8 5.5H5.5A2.5 2.5 0 008 10M16 5.5h2.5A2.5 2.5 0 0116 10M12 13v4M9.5 17h5l.5 3.5H9z" />
    </Svg>
  )
}

export function IconPodium(props: IconProps) {
  return (
    <Svg {...props}>
      {/* Three steps: second, first (tallest), third */}
      <path d="M3 20v-7h6v7M9 20V9h6v11M15 20v-5h6v5M2 20h20M12 3l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z" />
    </Svg>
  )
}

export function IconBracket(props: IconProps) {
  return (
    <Svg {...props}>
      {/* Four entrants → two semi-finals → one final */}
      <path d="M3 4h5v6H3M8 7h5M3 14h5v6H3M8 17h5M13 7v10M13 12h8" />
    </Svg>
  )
}

/** Scales: the legal pages. */
export function IconScale(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4v16M8 20h8M5 7h14M12 4.5l-1 2.5M12 4.5l1 2.5" />
      <path d="M5 7l-2.5 6a3 3 0 0 0 5 0zM19 7l-2.5 6a3 3 0 0 0 5 0z" />
    </Svg>
  )
}

/** A shield: privacy and cookie choices. */
export function IconShield(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5 5 6v5.5c0 4.2 3 7.6 7 9 4-1.4 7-4.8 7-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </Svg>
  )
}

export function IconDownload(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" />
    </Svg>
  )
}

export function IconTrash(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5M10.5 11v5M13.5 11v5" />
    </Svg>
  )
}

export function IconMail(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
      <path d="m4 7 8 6 8-6" />
    </Svg>
  )
}
