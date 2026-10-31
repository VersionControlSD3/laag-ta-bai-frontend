import type { ReactNode, SVGProps } from 'react'

/*
 * Ionicons 7.4.0 (MIT, (c) Ionic, https://ionic.io/ionicons), the icon set used in the Figma file
 * (Icons page). Paths are copied verbatim from `ionicons/dist/svg`. Outline icons stroke at
 * 32/512, which is the 1.5px stroke Figma shows at 24px. Add icons here as screens need them.
 */
type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & { size?: number }

function icon(paths: ReactNode) {
  return function Ionicon({ size = 24, ...props }: IconProps) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width={size} height={size} aria-hidden {...props}>
        {paths}
      </svg>
    )
  }
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  strokeWidth: 32,
} as const

export const MapIcon = icon(
  <path
    fill="currentColor"
    d="M48.17 113.34A32 32 0 0032 141.24V438a32 32 0 0047 28.37c.43-.23.85-.47 1.26-.74l84.14-55.05a8 8 0 003.63-6.72V46.45a8 8 0 00-12.51-6.63zM212.36 39.31A8 8 0 00200 46v357.56a8 8 0 003.63 6.72l96 62.42A8 8 0 00312 466V108.67a8 8 0 00-3.64-6.73zM464.53 46.47a31.64 31.64 0 00-31.5-.88 12.07 12.07 0 00-1.25.74l-84.15 55a8 8 0 00-3.63 6.72v357.46a8 8 0 0012.52 6.63l107.07-73.46a32 32 0 0016.41-28v-296a32.76 32.76 0 00-15.47-28.21z"
  />,
)

export const MapOutlineIcon = icon(
  <path
    {...stroke}
    d="M313.27 124.64L198.73 51.36a32 32 0 00-29.28.35L56.51 127.49A16 16 0 0048 141.63v295.8a16 16 0 0023.49 14.14l97.82-63.79a32 32 0 0129.5-.24l111.86 73a32 32 0 0029.27-.11l115.43-75.94a16 16 0 008.63-14.2V74.57a16 16 0 00-23.49-14.14l-98 63.86a32 32 0 01-29.24.35zM328 128v336M184 48v336"
  />,
)

export const BookIcon = icon(
  <path
    fill="currentColor"
    d="M202.24 74C166.11 56.75 115.61 48.3 48 48a31.36 31.36 0 00-17.92 5.33A32 32 0 0016 79.9V366c0 19.34 13.76 33.93 32 33.93 71.07 0 142.36 6.64 185.06 47a4.11 4.11 0 006.94-3V106.82a15.89 15.89 0 00-5.46-12A143 143 0 00202.24 74zM481.92 53.3A31.33 31.33 0 00464 48c-67.61.3-118.11 8.71-154.24 26a143.31 143.31 0 00-32.31 20.78 15.93 15.93 0 00-5.45 12v337.13a3.93 3.93 0 006.68 2.81c25.67-25.5 70.72-46.82 185.36-46.81a32 32 0 0032-32v-288a32 32 0 00-14.12-26.61z"
  />,
)

export const BookOutlineIcon = icon(
  <path
    {...stroke}
    d="M256 160c16-63.16 76.43-95.41 208-96a15.94 15.94 0 0116 16v288a16 16 0 01-16 16c-128 0-177.45 25.81-208 64-30.37-38-80-64-208-64-9.88 0-16-8.05-16-17.93V80a15.94 15.94 0 0116-16c131.57.59 192 32.84 208 96zM256 160v288"
  />,
)

export const CameraOutlineIcon = icon(
  <>
    <path
      {...stroke}
      d="M350.54 148.68l-26.62-42.06C318.31 100.08 310.62 96 302 96h-92c-8.62 0-16.31 4.08-21.92 10.62l-26.62 42.06C155.85 155.23 148.62 160 140 160H80a32 32 0 00-32 32v192a32 32 0 0032 32h352a32 32 0 0032-32V192a32 32 0 00-32-32h-59c-8.65 0-16.85-4.77-22.46-11.32z"
    />
    <circle cx="256" cy="272" r="80" fill="none" stroke="currentColor" strokeMiterlimit={10} strokeWidth={32} />
    <path {...stroke} d="M124 158v-22h-24v22" />
  </>,
)

export const TrophyIcon = icon(
  <path
    fill="currentColor"
    d="M464 80h-60.1a4 4 0 01-4-4V63.92a32 32 0 00-32-31.92l-223.79.26a32 32 0 00-31.94 31.93V76a4 4 0 01-4 4H48a16 16 0 00-16 16v16c0 54.53 30 112.45 76.52 125.35a7.82 7.82 0 015.55 5.9c5.77 26.89 23.52 52.5 51.41 73.61 20.91 15.83 45.85 27.5 68.27 32.48a8 8 0 016.25 7.8V444a4 4 0 01-4 4h-59.55c-8.61 0-16 6.62-16.43 15.23A16 16 0 00176 480h159.55c8.61 0 16-6.62 16.43-15.23A16 16 0 00336 448h-60a4 4 0 01-4-4v-86.86a8 8 0 016.25-7.8c22.42-5 47.36-16.65 68.27-32.48 27.89-21.11 45.64-46.72 51.41-73.61a7.82 7.82 0 015.55-5.9C450 224.45 480 166.53 480 112V96a16 16 0 00-16-16zM112 198.22a4 4 0 01-6 3.45c-10.26-6.11-17.75-15.37-22.14-21.89-11.91-17.69-19-40.67-19.79-63.63a4 4 0 014-4.15h40a4 4 0 014 4c-.02 27.45-.07 58.87-.07 82.22zm316.13-18.44c-4.39 6.52-11.87 15.78-22.13 21.89a4 4 0 01-6-3.46c0-26.51 0-56.63-.05-82.21a4 4 0 014-4h40a4 4 0 014 4.15c-.79 22.96-7.9 45.94-19.81 63.63z"
  />,
)

export const TrophyOutlineIcon = icon(
  <>
    <path
      {...stroke}
      d="M176 464h160M256 464V336M384 224c0-50.64-.08-134.63-.12-160a16 16 0 00-16-16l-223.79.26a16 16 0 00-16 15.95c0 30.58-.13 129.17-.13 159.79 0 64.28 83 112 128 112S384 288.28 384 224z"
    />
    <path {...stroke} d="M128 96H48v16c0 55.22 33.55 112 80 112M384 96h80v16c0 55.22-33.55 112-80 112" />
  </>,
)

export const PersonIcon = icon(
  <path
    fill="currentColor"
    d="M332.64 64.58C313.18 43.57 286 32 256 32c-30.16 0-57.43 11.5-76.8 32.38-19.58 21.11-29.12 49.8-26.88 80.78C156.76 206.28 203.27 256 256 256s99.16-49.71 103.67-110.82c2.27-30.7-7.33-59.33-27.03-80.6zM432 480H80a31 31 0 01-24.2-11.13c-6.5-7.77-9.12-18.38-7.18-29.11C57.06 392.94 83.4 353.61 124.8 326c36.78-24.51 83.37-38 131.2-38s94.42 13.5 131.2 38c41.4 27.6 67.74 66.93 76.18 113.75 1.94 10.73-.68 21.34-7.18 29.11A31 31 0 01432 480z"
  />,
)

export const PersonOutlineIcon = icon(
  <>
    <path {...stroke} d="M344 144c-3.92 52.87-44 96-88 96s-84.15-43.12-88-96c-4-55 35-96 88-96s92 42 88 96z" />
    <path
      fill="none"
      stroke="currentColor"
      strokeMiterlimit={10}
      strokeWidth={32}
      d="M256 304c-87 0-175.3 48-191.64 138.6C62.39 453.52 68.57 464 80 464h352c11.44 0 17.62-10.48 15.65-21.4C431.3 352 343 304 256 304z"
    />
  </>,
)

export const BookmarkIcon = icon(
  <path
    fill="currentColor"
    d="M400 480a16 16 0 01-10.63-4L256 357.41 122.63 476A16 16 0 0196 464V96a64.07 64.07 0 0164-64h192a64.07 64.07 0 0164 64v368a16 16 0 01-16 16z"
  />,
)

export const BookmarkOutlineIcon = icon(
  <path
    {...stroke}
    d="M352 48H160a48 48 0 00-48 48v368l144-128 144 128V96a48 48 0 00-48-48z"
  />,
)

export const CheckmarkCircleOutlineIcon = icon(
  <>
    <path
      {...stroke}
      strokeMiterlimit={10}
      d="M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192 192-86 192-192z"
    />
    <path {...stroke} d="M352 176L217.6 336 160 272" />
  </>,
)

export const EyeOutlineIcon = icon(
  <>
    <path
      {...stroke}
      d="M255.66 112c-77.94 0-157.89 45.11-220.83 135.33a16 16 0 00-.27 17.77C82.92 340.8 161.8 400 255.66 400c92.84 0 173.34-59.38 221.79-135.25a16.14 16.14 0 000-17.47C428.89 172.28 347.8 112 255.66 112z"
    />
    <circle cx="256" cy="256" r="80" fill="none" stroke="currentColor" strokeMiterlimit={10} strokeWidth={32} />
  </>,
)

export const TimeOutlineIcon = icon(
  <>
    <path
      {...stroke}
      strokeMiterlimit={10}
      d="M256 64C150 64 64 150 64 256s86 192 192 192 192-86 192-192S362 64 256 64z"
    />
    <path {...stroke} d="M256 128v144h96" />
  </>,
)

export const LocationOutlineIcon = icon(
  <>
    <path
      {...stroke}
      d="M256 48c-79.5 0-144 61.39-144 137 0 87 96 224.87 131.25 272.49a15.77 15.77 0 0025.5 0C304 409.89 400 272.07 400 185c0-75.61-64.5-137-144-137z"
    />
    <circle cx="256" cy="192" r="48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={32} />
  </>,
)

export const StarIcon = icon(
  <path
    fill="currentColor"
    d="M394 480a16 16 0 01-9.39-3L256 383.76 127.39 477a16 16 0 01-24.55-18.08L153 310.35 23 221.2a16 16 0 019-29.2h160.38l48.4-148.95a16 16 0 0130.44 0l48.4 149H480a16 16 0 019.05 29.2L359 310.35l50.13 148.53A16 16 0 01394 480z"
  />,
)

export const ArrowUndoOutlineIcon = icon(
  <path {...stroke} d="M240 424v-96c116.4 0 159.39 33.76 208 96 0-119.23-39.57-240-208-240V88L64 256z" />,
)

export const CloudOfflineOutlineIcon = icon(
  <>
    <path
      {...stroke}
      d="M93.72 183.25C49.49 198.05 16 233.1 16 288c0 66 54 112 120 112h184.37M467.82 377.74C485.24 363.3 496 341.61 496 312c0-59.82-53-85.76-96-88-8.89-89.54-71-144-144-144-26.16 0-48.79 6.93-67.6 18.14"
    />
    <path {...stroke} strokeMiterlimit={10} d="M448 448L64 64" />
  </>,
)

export const CompassOutlineIcon = icon(
  <>
    <path
      {...stroke}
      strokeMiterlimit={10}
      d="M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192 192-86 192-192z"
    />
    <path
      fill="currentColor"
      d="M350.67 150.93l-117.2 46.88a64 64 0 00-35.66 35.66l-46.88 117.2a8 8 0 0010.4 10.4l117.2-46.88a64 64 0 0035.66-35.66l46.88-117.2a8 8 0 00-10.4-10.4zM256 280a24 24 0 1124-24 24 24 0 01-24 24z"
    />
  </>,
)

export const CloseOutlineIcon = icon(
  <path {...stroke} d="M368 368L144 144M368 144L144 368" />,
)
