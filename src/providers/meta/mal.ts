import { load } from 'cheerio'
import ky, { type KyInstance } from 'ky'
import { formatDistance } from 'date-fns'

import type {
  ICharacter,
  IFormat,
  IGenre,
  ISeason,
  IStatus,
  IStudio,
  RelationType,
} from '../../types/anime'
import type {
  AnilistMediaFormat,
  FribbAnime,
  IRelation,
  ProviderInfo,
  ProviderEpisode,
} from '../../types/provider'

import { MetaBase } from '../base/meta'

class MyAnimeList extends MetaBase {
  override name: string = 'myanimelist'
  override url: string = 'https://myanimelist.net'

  public override client: KyInstance = ky.create({
    prefixUrl: 'https://myanimelist.net',
  })

  override async getInfo(anime: FribbAnime): Promise<ProviderInfo | undefined> {
    const malId = anime.mal_id

    if (!malId) return undefined

    const [detailsRes, charactersRes] = await Promise.all([
      this.client.get(`anime/${malId}`),
      this.client.get(`anime/${malId}/fuckyou/characters`),
    ])

    const details = await detailsRes.text()
    const characters = await charactersRes.text()

    const $ = load(details)
    const $$ = load(characters)

    const titles = this.extractTitles($)
    const synonyms = this.extractSynonyms($)

    const coverImage = $('img[itemprop="image"]').attr('data-src') || null
    const bannerImage = null // MAL doesn't provide banner images on this page

    const description = $('p[itemprop="description"]').text().trim() || null

    const status = this.extractStatus($)
    const format = this.extractFormat($)
    const season = this.extractSeason($)

    const airDate = this.extractAirDate($)

    const episodeText = $('.spaceit_pad:contains("Episodes:")').text()
    const totalEpisodes = episodeText
      ? parseInt(episodeText.split(':')[1]?.trim() as string, 10) || null
      : null
    const currentEpisode = null // Would need additional logic to determine

    const ratingText = $('.score-label').text().trim()
    const rating = ratingText ? parseFloat(ratingText) : null

    const ageRating =
      $('.spaceit_pad:contains("Rating:")').text().split(':')[1]?.trim() || null

    const genres = this.extractGenres($)
    const studios = this.extractStudios($)

    const charactersList = this.extractCharacters($$)

    const relations = this.extractRelations($)

    const countryOfOrigin = 'JP'

    return {
      id: malId.toString(),
      titles,
      synonyms,
      coverImage,
      bannerImage,
      logoImage: null,
      color: null,
      description,
      airDate,
      status,
      format,
      season,
      relations,
      currentEpisode,
      countryOfOrigin,
      totalEpisodes,
      subCount: null,
      dubCount: null,
      rating,
      ageRating,
      characters: charactersList,
      artwork: coverImage
        ? [
            {
              type: 'poster',
              image: coverImage,
              providerId: 'myanimelist',
            },
          ]
        : [],
      studio: studios,
      genres,
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  }

  private extractTitles($: ReturnType<typeof load>) {
    const titles = []

    const englishTitle = $('.title-english').text().trim()
    if (englishTitle) {
      titles.push({ languageCode: 'english', title: englishTitle })
    }

    const japaneseTitle = $('.spaceit_pad:contains("Japanese:")')
      .text()
      .split(':')[1]
      ?.trim()
    if (japaneseTitle) {
      titles.push({ languageCode: 'japanese', title: japaneseTitle })
    }

    const mainTitle = $('h1.title-name strong').text().trim()
    if (mainTitle && !titles.some((t) => t.title === mainTitle)) {
      titles.push({ languageCode: 'romaji', title: mainTitle })
    }

    return titles
  }

  private extractSynonyms($: ReturnType<typeof load>) {
    const synonymsText = $('.spaceit_pad:contains("Synonyms:")')
      .text()
      .split(':')[1]
      ?.trim()
    return synonymsText ? synonymsText.split(',').map((s) => s.trim()) : []
  }

  private extractStatus($: ReturnType<typeof load>): IStatus | null {
    const statusText = $('.spaceit_pad:contains("Status:")')
      .text()
      .split(':')[1]
      ?.trim()
      .toLowerCase()

    if (!statusText) return null

    if (statusText.includes('airing')) return 'airing'
    if (statusText.includes('finished')) return 'finished'
    if (statusText.includes('upcoming') || statusText.includes('not yet aired'))
      return 'upcoming'
    if (statusText.includes('hiatus')) return 'hiatus'
    if (statusText.includes('cancelled')) return 'cancelled'

    return null
  }

  private extractFormat($: ReturnType<typeof load>): IFormat | null {
    const typeText = $('.spaceit_pad:contains("Type:")')
      .text()
      .split(':')[1]
      ?.trim()
      .toLowerCase()

    if (!typeText) return null

    if (typeText.includes('tv')) return 'tv show'
    if (typeText.includes('movie')) return 'movie'
    if (typeText.includes('special')) return 'special'
    if (typeText.includes('ova')) return 'ova'
    if (typeText.includes('ona')) return 'ona'
    if (typeText.includes('music')) return 'music'

    return null
  }

  private extractSeason($: ReturnType<typeof load>): ISeason | null {
    const seasonText = $('.spaceit_pad:contains("Premiered:")')
      .text()
      .split(':')[1]
      ?.trim()
      .toLowerCase()

    if (!seasonText) return null

    if (seasonText.includes('winter')) return 'winter'
    if (seasonText.includes('spring')) return 'spring'
    if (seasonText.includes('summer')) return 'summer'
    if (seasonText.includes('fall')) return 'fall'

    return null
  }

  private extractAirDate($: ReturnType<typeof load>) {
    const airedText = $('.spaceit_pad:contains("Aired:")')
      .text()
      .split(':')[1]
      ?.trim()

    if (!airedText) return null

    const dates = airedText.split(' to ')
    const startDate = this.parseDate(dates[0]?.trim())
    const endDate = dates[1]
      ? this.parseDate(dates[1].trim())
      : { month: null, year: null, day: null, string: null }

    return {
      start: startDate,
      end: endDate,
    }
  }

  private parseDate(dateStr: string | undefined) {
    if (!dateStr || dateStr === '?') {
      return { month: null, year: null, day: null, string: null }
    }

    const monthMap: Record<string, number> = {
      Jan: 1,
      Feb: 2,
      Mar: 3,
      Apr: 4,
      May: 5,
      Jun: 6,
      Jul: 7,
      Aug: 8,
      Sep: 9,
      Oct: 10,
      Nov: 11,
      Dec: 12,
    }

    const parts = dateStr.split(' ').filter((p) => p)

    if (parts.length === 3) {
      return {
        month: monthMap[parts[0] as string] || null,
        day: parseInt(parts[1]?.replace(',', '') as string, 10) || null,
        year: parseInt(parts[2] as string, 10) || null,
        string: dateStr,
      }
    } else if (parts.length === 2) {
      return {
        month: monthMap[parts[0] as string] || null,
        day: null,
        year: parseInt(parts[1] as string, 10) || null,
        string: dateStr,
      }
    }

    return { month: null, year: null, day: null, string: dateStr }
  }

  private extractGenres($: ReturnType<typeof load>): IGenre[] {
    const genres: IGenre[] = []

    $('.spaceit_pad:contains("Genres:") a').each((i, el) => {
      const name = $(el).text().trim()
      const href = $(el).attr('href') || ''
      const idMatch = href.match(/\/(\d+)\//)
      const id = idMatch ? parseInt(idMatch[1] as string, 10) : i

      if (name) {
        genres.push({ id, name })
      }
    })

    return genres
  }

  private extractStudios($: ReturnType<typeof load>) {
    const studios: IStudio[] = []

    $('.spaceit_pad:contains("Studios:") a').each((i, el) => {
      const name = $(el).text().trim()
      const href = $(el).attr('href') || ''
      const idMatch = href.match(/\/(\d+)\//)
      const id = idMatch ? parseInt(idMatch[1] as string, 10) : i

      if (name) {
        studios.push({ id, name })
      }
    })

    return studios
  }

  private extractCharacters($$: ReturnType<typeof load>): ICharacter[] {
    const characters: ICharacter[] = []

    $$('.js-anime-character-table').each((_, table) => {
      const characterImage =
        $$(table).find('td.ac img').attr('data-src') || null
      const characterName =
        $$(table).find('.h3_character_name').text().trim() || null
      const characterRole =
        $$(table).find('.spaceit_pad small').first().text().trim() || null

      const voiceActorName =
        $$(table).find('.js-anime-character-va-lang a').first().text().trim() ||
        null
      const voiceActorImage =
        $$(table).find('.js-anime-character-va-lang img').attr('data-src') ||
        null

      characters.push({
        image: characterImage,
        name: characterName,
        role: characterRole?.toLowerCase() || null,
        voiceActor: {
          image: voiceActorImage,
          name: voiceActorName,
        },
      })
    })

    return characters
  }

  private extractRelations($: ReturnType<typeof load>): IRelation[] | null {
    const relations: IRelation[] = []

    $('.entries-tile .entry').each((_, entry) => {
      const relationText = $(entry).find('.relation').text().trim()
      const relationType = this.mapRelationType(relationText)

      const href = $(entry).find('a').attr('href') || ''
      const idMatch = href.match(/\/(\d+)\//)
      const id = idMatch ? parseInt(idMatch[1] as string, 10) : 0

      const title = $(entry).find('.title a').text().trim()
      const formatText =
        $(entry)
          .find('.relation')
          .text()
          .match(/\((.*?)\)/)?.[1] || null

      if (id && title) {
        relations.push({
          relationType,
          id,
          titles: [{ languageCode: 'en', title }],
          format: formatText as AnilistMediaFormat,
          type: relationText.split('(')[0]?.trim() as string,
        })
      }
    })

    return relations.length > 0 ? relations : null
  }

  private mapRelationType(text: string): RelationType | null {
    const lowerText = text.toLowerCase()

    if (lowerText.includes('prequel')) return 'PREQUEL'
    if (lowerText.includes('sequel')) return 'SEQUEL'
    if (lowerText.includes('alternative')) return 'ALTERNATIVE'
    if (lowerText.includes('side story')) return 'SIDE_STORY'
    if (lowerText.includes('parent')) return 'PARENT'
    if (lowerText.includes('spin')) return 'SPIN_OFF'

    return 'OTHER'
  }

  private parseAiredDate(dateStr: string | null): number | null {
    if (!dateStr) return null

    // Parse MAL date format: "Jul 3, 2024" or "Jan 16, 2026"
    const monthMap: Record<string, number> = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    }

    const parts = dateStr.split(' ')
    if (parts.length !== 3) return null

    const month = monthMap[parts[0] as string]
    const day = parseInt(parts[1]?.replace(',', '') || '0', 10)
    const year = parseInt(parts[2] || '0', 10)

    if (month === undefined || !day || !year) return null

    return new Date(year, month, day).getTime()
  }

  async getEpisodes(anime: FribbAnime): Promise<ProviderEpisode[] | undefined> {
    const malId = anime.mal_id

    if (!malId) return undefined

    const episodesRes = await this.client.get(`anime/${malId}/fuckyou/episode`)
    const html = await episodesRes.text()
    const $ = load(html)

    const episodes: ProviderEpisode[] = []
    const now = Date.now()

    $('.episode-list-data').each((_, el) => {
      const $row = $(el)

      const episodeNumText = $row.find('.episode-number').text().trim()
      const episodeNumber = episodeNumText ? parseInt(episodeNumText, 10) : null

      const titleEl = $row.find('.episode-title')
      const englishTitle = titleEl.find('a').text().trim() || null
      const japaneseTitle = titleEl.find('.di-ib').text().trim() || null

      const titles = []
      if (englishTitle) {
        titles.push({ languageCode: 'en', title: englishTitle })
      }
      if (japaneseTitle) {
        const cleanJapanese = japaneseTitle.replace(/^[^\(]*\(|\)$/g, '').trim()
        titles.push({ languageCode: 'ja', title: cleanJapanese })
      }

      const episodeTypeBadge = titleEl
        .find('.icon-episode-type-bg')
        .text()
        .trim()
        .toLowerCase()
      const isFiller = episodeTypeBadge.includes('filler')
      const isRecap = episodeTypeBadge.includes('recap')

      const airedText = $row.find('.episode-aired').text().trim() || null
      const airedTimestamp = this.parseAiredDate(airedText)

      const ago = airedTimestamp
        ? formatDistance(airedTimestamp, now, { addSuffix: true })
        : null

      const ratingEl = $row.find('.episode-poll')
      const ratingValue = ratingEl.find('.value').text().trim()
      const rating = ratingValue ? parseFloat(ratingValue) : null

      const episodeLink = titleEl.find('a').attr('href') || ''
      const episodeId = episodeLink
        ? episodeLink.split('/').pop() || null
        : null

      if (episodeNumber) {
        episodes.push({
          id: episodeId,
          titles: titles.length > 0 ? titles : null,
          thumbnailImage: null,
          preview: null,
          description: null,
          number: episodeNumber,
          rating,
          filler: isFiller,
          recap: isRecap,
          runtime: null,
          ago,
          createdAt: airedTimestamp || now,
          updatedAt: airedTimestamp || now,
        })
      }
    })

    return episodes.length > 0 ? episodes : undefined
  }
}

export default MyAnimeList

// const mal = new MyAnimeList()

// await Bun.write(
//   'episode.json',
//   JSON.stringify(
//     await mal.getEpisodes({
//       type: 'TV',
//       anidb_id: 17630,
//       anilist_id: 154768,
//       animecountdown_id: 1995266,
//       'anime-planet_id': 'my-dress-up-darling-season-2',
//       anisearch_id: 17703,
//       imdb_id: 'tt15765670',
//       kitsu_id: 46492,
//       livechart_id: 11514,
//       mal_id: 53065,
//       simkl_id: 1995266,
//       themoviedb_id: 123249,
//       tvdb_id: 401233,
//       season: {
//         tvdb: 2,
//         tmdb: 2,
//       },
//     }),
//     null,
//     2,
//   ),
// )
