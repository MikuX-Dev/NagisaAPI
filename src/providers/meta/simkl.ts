import { load } from 'cheerio'
import ky, { type KyInstance } from 'ky'

import type { RelationType } from '../../types/anime'
import type {
  AnilistMediaFormat,
  FribbAnime,
  ProviderEpisode,
  ProviderInfo,
} from '../../types/provider'

import { MetaBase } from '../base/meta'

class Simkl extends MetaBase {
  override name: string = 'smikl'
  override url: string = 'https://simkl.com'

  public override client: KyInstance = ky.create({
    prefixUrl: this.url,
  })

  private parseDate(date: string | undefined) {
    if (!date) return { day: null, month: null, year: null, string: null }

    const [m, d, y] = date.split('/').map(Number)
    return {
      month: m ?? null,
      day: d ?? null,
      year: y ?? null,
      string: date,
    }
  }

  override async getInfo(anime: FribbAnime): Promise<ProviderInfo | undefined> {
    const smiklId = anime.simkl_id

    if (!smiklId) return undefined

    const data = await this.client.get(`anime/${smiklId.toString()}`).text()
    const $ = load(data)

    const title = $('h1.headDetail').text().trim()
    const coverImage =
      $('img#detailPosterImg').attr('src') &&
      new URL(
        $('img#detailPosterImg').attr('src') as string,
        'https://simkl.com',
      ).href

    let airDateText: string = ''
    $('td.SimklTVAboutTabsDetails table tbody tr').each((_, row) => {
      const label = $(row).find('td').first().text().replace(/\s+/g, ' ').trim()

      if (label.startsWith('Air Date')) {
        airDateText = $(row).find('td').eq(1).text().replace(/\s+/g, ' ').trim()
      }
    })
    const [startRaw, endRaw] = airDateText.split('-').map((s) => s.trim())

    const descTd = $(
      'td.SimklTVAboutDetailsText[itemprop="description"]',
    ).clone()
    descTd.find('#adDescText, #moreDescButton').remove()
    const more = descTd.find('#moreDesc').text()
    descTd.find('#moreDesc').remove()
    const base = descTd.text()
    const description = `${base} ${more}`.replace(/\s+/g, ' ').trim() ?? null

    return {
      titles: [
        {
          languageCode: 'english',
          title: title ?? null,
        },
      ],
      coverImage: coverImage ?? null,
      studio: $('a.ajCompany')
        .map((_, el) => ({
          id: 0,
          name: $(el).text().trim() ?? null,
        }))
        .get(),
      ageRating: $('td[itemprop="contentRating"]').text().trim() ?? null,
      tags: $('a.tag.ajList')
        .map((_, el) => ({
          id: 0,
          name: $(el).text().trim() ?? null,
        }))
        .get(),
      airDate: {
        start: this.parseDate(startRaw),
        end: this.parseDate(endRaw),
      },
      synonyms:
        $('td[itemprop="alternateName"]')
          .text()
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean) ?? null,
      description,
      genres: $('td.SimklTVAboutGenre span.TagGenre')
        .map((_, el) => ({
          id: 0,
          name: $(el).text().trim(),
        }))
        .get(),
      countryOfOrigin:
        $('td.SimklTVAboutTabsDetails table tbody tr')
          .toArray()
          .map((tr) => {
            const tds = $(tr).find('td')
            return tds.first().text().includes('Country')
              ? tds.eq(1).text().trim()
              : null
          })
          .find(Boolean) ?? null,
      relations: $('div.tvdetailrelationsitems a')
        .map((_, el) => ({
          id:
            Number(
              $(el)
                .attr('href')
                ?.match(/\/(\d+)\//)?.[1],
            ) || 0,
          relationType: (
            [
              'PREQUEL',
              'SEQUEL',
              'ALTERNATIVE',
              'SIDE_STORY',
              'PARENT',
              'SPIN_OFF',
              'OTHER',
            ] as const
          ).includes(
            $(el)
              .find('.tvdetailrelationsitemrighttype')
              .text()
              .trim()
              .toUpperCase()
              .replace(/\s+/g, '_') as RelationType,
          )
            ? ($(el)
                .find('.tvdetailrelationsitemrighttype')
                .text()
                .trim()
                .toUpperCase()
                .replace(/\s+/g, '_') as RelationType)
            : null,
          titles: [
            {
              languageCode: 'english',
              title: $(el)
                .find('.tvdetailrelationsitemrighttitle')
                .text()
                .trim(),
            },
          ],
          format:
            ($(el)
              .find('.tvdetailrelationsitemrightdetails div')
              .text()
              .split(',')[0]
              ?.trim()
              .toUpperCase() as AnilistMediaFormat) ?? null,
          type: null,
        }))
        .get(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  }

  public async getEpisodes(
    anime: FribbAnime,
  ): Promise<ProviderEpisode[] | undefined> {
    const smiklId = anime.simkl_id
    if (!smiklId) return undefined

    const data = await this.client.get(`anime/${smiklId}/episodes`).text()
    const $ = load(data)

    const click = $('#InfoTabsEpisodes a').attr('href')
    const episodesLink = click?.startsWith('/') ? click.slice(1) : click

    if (!episodesLink) return undefined

    const episodeRes = await this.client.get(episodesLink).text()

    const basicEpisodes = this.extractEpisodeData(episodeRes)

    const contents = await Promise.all(
      basicEpisodes.map((episode) => this.fetchEpisodeContentData(episode.url)),
    )

    const episodes: ProviderEpisode[] = basicEpisodes.map((episode, index) => ({
      id: episode.id,
      title: episode.title,
      number: episode.number,
      thumbnailImage:
        contents[index]?.thumbnail ??
        (episode.img?.startsWith('//') ? `https:${episode.img}` : episode.img),
      description: contents[index]?.description || null,
      rating: null,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    }))

    return episodes
  }

  private extractEpisodeData(html: string): EpisodeBasicInfo[] {
    const $ = load(html)
    const episodes: EpisodeBasicInfo[] = []

    $('.SimklTVAboutTabsDetailsDiv.goEpisode').each((_, element) => {
      const $el = $(element)

      const epNumberText = $el.find('.SimklTVEpisodesEpNumber').text().trim()
      const epMatch = epNumberText.match(/Ep\.\s*(\d+)/)
      const number = epMatch ? parseInt(epMatch[1] as string, 10) : 0

      const title = $el.find('.SimklTVEpisodesEpTitle').text().trim()
      const url = $el.find('a').attr('href') || ''
      const id = $el.attr('data-id') || ''
      const hasDub = $el.hasClass('has-dub')

      const thumbnailUrl = $el.find('img.lazy').attr('data-original') || ''
      const img =
        thumbnailUrl && !thumbnailUrl.includes('data:image/gif')
          ? thumbnailUrl
          : null

      episodes.push({
        id,
        number,
        title,
        url,
        hasDub,
        img,
      })
    })

    return episodes
  }

  private async fetchEpisodeContentData(episodeUrl: string) {
    try {
      const cleanUrl = episodeUrl.startsWith('/')
        ? episodeUrl.slice(1)
        : episodeUrl
      const res = await this.client.get(cleanUrl).text()
      const $ = load(res)

      const description = $('.episode-description-text').text().trim()
      const img = $('#detailScreenImg').attr('src')
      const thumbnail = img?.startsWith('//') ? `https:${img}` : img
      return {
        description,
        thumbnail,
      }
    } catch (error) {
      console.error(`Error fetching description for ${episodeUrl}:`, error)
      return null
    }
  }
}

export default Simkl

interface EpisodeBasicInfo {
  id: string
  number: number
  title: string
  url: string
  hasDub: boolean
  img: string | null
}

// await Bun.write(
//   'index.json',
//   JSON.stringify(
//     await simkl.getEpisodes({
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
