import type { ProviderSearch } from '../../types/provider'
import { sanitizeTitle } from './sanitize-title'

export interface TokenizeOptions {
  lowercase?: boolean
  removePunctuation?: boolean
  removeExtraSpaces?: boolean
}

export interface CompareOptions extends TokenizeOptions {
  prefixScale?: number
  boostThreshold?: number
}

function tokenize(str: string, options: TokenizeOptions = {}): string[] {
  const {
    lowercase = true,
    removePunctuation = true,
    removeExtraSpaces = true,
  } = options

  let processed = str

  if (lowercase) {
    processed = processed.toLowerCase()
  }

  if (removePunctuation) {
    processed = processed.replace(/[^\w\s]/g, ' ')
  }

  if (removeExtraSpaces) {
    processed = processed.replace(/\s+/g, ' ').trim()
  }

  return processed.split(' ').filter((token) => token.length > 0)
}

function jaroDistance(s1: string, s2: string): number {
  if (s1 === s2) return 1.0
  if (s1.length === 0 || s2.length === 0) return 0.0

  const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1
  const s1Matches = new Array(s1.length).fill(false)
  const s2Matches = new Array(s2.length).fill(false)

  let matches = 0
  let transpositions = 0

  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchWindow)
    const end = Math.min(i + matchWindow + 1, s2.length)

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue
      s1Matches[i] = true
      s2Matches[j] = true
      matches++
      break
    }
  }

  if (matches === 0) return 0.0

  let k = 0
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue
    while (!s2Matches[k]) k++
    if (s1[i] !== s2[k]) transpositions++
    k++
  }

  return (
    (matches / s1.length +
      matches / s2.length +
      (matches - transpositions / 2) / matches) /
    3.0
  )
}

// jaroWinkler. Because it handles transpositions. Meaning "hello world" will match with "world hello". Levenshtein would fail on it.
function jaroWinkler(
  s1: string,
  s2: string,
  prefixScale: number = 0.1,
): number {
  const jaroSim = jaroDistance(s1, s2)

  let prefixLength = 0
  const maxPrefix = Math.min(4, Math.min(s1.length, s2.length))

  for (let i = 0; i < maxPrefix; i++) {
    if (s1[i] === s2[i]) {
      prefixLength++
    } else {
      break
    }
  }

  return jaroSim + prefixLength * prefixScale * (1 - jaroSim)
}

export function compareTwoStrings(
  str1: string,
  str2: string,
  options: CompareOptions = {},
): number {
  const { prefixScale = 0.1, boostThreshold = 0.7, ...tokenizeOpts } = options

  const tokens1 = tokenize(str1, tokenizeOpts)
  const tokens2 = tokenize(str2, tokenizeOpts)

  if (tokens1.length === 0 || tokens2.length === 0) {
    return tokens1.length === tokens2.length ? 1.0 : 0.0
  }

  const scores: number[] = []

  for (const t1 of tokens1) {
    let maxScore = 0
    for (const t2 of tokens2) {
      const score = jaroWinkler(t1, t2, prefixScale)
      maxScore = Math.max(maxScore, score)
    }
    scores.push(maxScore)
  }

  for (const t2 of tokens2) {
    let maxScore = 0
    for (const t1 of tokens1) {
      const score = jaroWinkler(t1, t2, prefixScale)
      maxScore = Math.max(maxScore, score)
    }
    scores.push(maxScore)
  }

  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length

  return Math.min(1.0, avgScore)
}

export function closest(
  target: string,
  list: Array<string>,
  options: CompareOptions = {},
): string | null {
  if (list.length === 0) return null

  let bestMatch: string = list[0] as string
  let highestScore = compareTwoStrings(
    target,
    typeof bestMatch === 'string' ? bestMatch : '',
    options,
  )

  for (const item of list) {
    const text = typeof item === 'string' ? item : ''
    const score = compareTwoStrings(target, text, options)

    if (score > highestScore) {
      highestScore = score
      bestMatch = item
    }
  }

  return bestMatch
}

type FrequencyMap = { [key: string]: number }
type IndexMap = { [key: string]: number }

const normalize = (str: string | null | undefined) =>
  str ? sanitizeTitle(str.toLowerCase()) : ''

const FindBestMatchByTitles = (
  title: {
    english?: string
    native?: string
    romaji?: string
  },
  results: ProviderSearch[],
) => {
  const resultTitles = results.map((r) => normalize(r.title))

  const bestMatch_english =
    title.english && closest(normalize(title.english), resultTitles)
  const bestMatch_romaji =
    title.romaji && closest(normalize(title.romaji), resultTitles)
  const bestMatch_native =
    title.native && closest(normalize(title.native), resultTitles)

  const matches: string[] = [
    bestMatch_english as string,
    bestMatch_romaji as string,
    bestMatch_native as string,
  ]

  // Count the frequency of each match and store the first index it appears
  const frequencyMap: FrequencyMap = {}
  const indexMap: IndexMap = {}

  matches.forEach((match) => {
    frequencyMap[match] = (frequencyMap[match] || 0) + 1
    if (indexMap[match] === undefined) {
      indexMap[match] = resultTitles.indexOf(match)
    }
  })

  // Find the most common match
  let mostCommonMatch: string | null = null
  let maxFrequency = 0

  for (const [match, frequency] of Object.entries(frequencyMap)) {
    if (frequency > maxFrequency) {
      mostCommonMatch = match
      maxFrequency = frequency
    }
  }

  const mostCommonMatchIndex = mostCommonMatch ? indexMap[mostCommonMatch] : -1

  return { mostCommonMatch, mostCommonMatchIndex }
}

export { FindBestMatchByTitles }
