import { Vibrant } from 'node-vibrant/node'

function isNearWhiteOrBlack(hexColor: string, threshold: number = 30): boolean {
  const hex = hexColor.replace('#', '')

  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  const isNearBlack = r < threshold && g < threshold && b < threshold

  const isNearWhite =
    r > 255 - threshold && g > 255 - threshold && b > 255 - threshold

  return isNearBlack || isNearWhite
}

interface DominantColorOptions {
  threshold?: number
  quality?: number
}

export async function getDominantColor(
  imageSource?: string,
  options: DominantColorOptions = {},
): Promise<string | null> {
  if (!imageSource) return null

  const { threshold = 30, quality = 5 } = options

  try {
    const palette = await Vibrant.from(imageSource)
      .quality(quality)
      .getPalette()

    const swatchPriority: Array<keyof typeof palette> = [
      'Vibrant',
      'DarkVibrant',
      'LightVibrant',
      'Muted',
      'DarkMuted',
      'LightMuted',
    ]

    for (const swatchName of swatchPriority) {
      const swatch = palette[swatchName]

      if (swatch) {
        const hexColor = swatch.hex

        if (!isNearWhiteOrBlack(hexColor, threshold)) {
          return hexColor
        }
      }
    }

    if (palette.Vibrant) return palette.Vibrant.hex
    if (palette.DarkVibrant) return palette.DarkVibrant.hex
    if (palette.Muted) return palette.Muted.hex

    return '#6366f1'
  } catch (error) {
    console.error(
      `Failed to get dominant color: ${error instanceof Error ? error.message : 'Unknown error'} >_<`,
    )

    return null
  }
}
