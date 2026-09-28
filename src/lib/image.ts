/** Accepted avatar uploads: up to 2 MB, JPG, PNG or WebP. */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const AVATAR_SIZE = 256

export type AvatarFileProblem = 'too-large' | 'wrong-type' | null

/** Why a chosen file can't be an avatar, or null. */
export function checkAvatarFile(file: Pick<File, 'size' | 'type'>): AvatarFileProblem {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) return 'wrong-type'
  if (file.size > AVATAR_MAX_BYTES) return 'too-large'
  return null
}

/**
 * The picture, centre-cropped to a square and scaled to 256 × 256, as WebP
 * (JPEG where the browser can't make WebP). Rejects if it can't be read.
 */
export async function squareAvatar(file: Blob, size = AVATAR_SIZE): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const side = Math.min(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')
    if (!context) throw new Error('No canvas')
    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
    const webp = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9))
    if (webp && webp.type === 'image/webp') return webp
    const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    if (!jpeg) throw new Error('Could not encode the image')
    return jpeg
  } finally {
    bitmap.close()
  }
}
