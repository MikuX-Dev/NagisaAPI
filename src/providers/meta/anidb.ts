import { load } from 'cheerio'
import ky, { type KyInstance } from 'ky'
import { startCase } from 'lodash'

import type { ICharacter, IGenre } from '../../types/anime'
import type {
  FribbAnime,
  ProviderEpisode,
  ProviderInfo,
} from '../../types/provider'

import { MetaBase } from '../base/meta'

class Anidb extends MetaBase {
  override name: string = 'anidb'
  override url: string = 'https://anidb.net'

  public override client: KyInstance = ky.create({
    prefixUrl: this.url,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
      'upgrade-insecure-requests': '1',
    },
  })

  private parseDate(dateStr: string | undefined): string | null {
    if (!dateStr) return null

    const parts = dateStr.split('.')

    if (parts.length !== 3) {
      return null
    }

    const day = Number(parts[0])
    const month = Number(parts[1])
    const year = Number(parts[2])

    if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) {
      return null
    }

    return new Date(year, month - 1, day).toISOString()
  }

  override async getInfo(anime: FribbAnime): Promise<ProviderInfo | undefined> {
    const aniDbId = anime.anidb_id

    if (!aniDbId) return undefined

    const data = await this.client.get(`anime/${aniDbId.toString()}`).text()
    const $ = load(data)

    const characters: ICharacter[] = []

    $('div#characterlist div.character div.column div.g_bubble').each(
      (_, el) => {
        characters.push({
          image: $(el).find('div.thumb img').attr('src') ?? null,
          name: $(el)
            .find('div.data div.name a.name-colored span')
            .text()
            ?.trim(),
          role: null,
          voiceActor: {
            image: null,
            name: $('div.info div.seiyuu span.name a.primary span')
              .first()
              .text()
              ?.trim(),
          },
        })
      },
    )

    $('div#characterlist div.cast div.column div.g_bubble').each((_, el) => {
      characters.push({
        image: $(el).find('div.thumb img').attr('src') ?? null,
        name: $(el)
          .find('div.data div.name a.name-colored span')
          .text()
          ?.trim(),
        role: null,
        voiceActor: {
          image: null,
          name: $('div.info div.seiyuu span.name a.primary span')
            .first()
            .text()
            ?.trim(),
        },
      })
    })

    const genres = $('tr.g_odd.tags td.value span[itemprop="genre"]')
      .map(
        (_, e) =>
          ({
            id: 0,
            name: startCase($(e).text().trim()),
          }) as IGenre,
      )
      .get()
      .filter((e) => e && !['Manga', 'Anime', 'Novel'].includes(e.name))

    const dateStr = $('tr.g_odd.year').find('td.value').text().trim()
    const dates = dateStr.split('until')

    const startDate = dates[0]?.trim()
    const endDate = dates[1]?.trim()

    return {
      titles: [
        {
          languageCode: 'english',
          title:
            $('div.info div.titles tr.official')
              .first()
              ?.find('td.value label')
              .text() ?? null,
        },
        {
          languageCode: 'japanese',
          title:
            $('div.info div.titles tr.official')
              .last()
              ?.find('td.value label')
              .text() ?? null,
        },
        {
          languageCode: 'romaji',
          title:
            $('div.info div.titles tr.romaji td.value span').text() ?? null,
        },
      ],
      synonyms:
        $('div.info div.titles tr.syn td.value')
          .text()
          ?.split(', ')
          .map((data) => data.trim())
          .concat($('div.titles tr.short td.value').text()) ?? [],
      genres: genres,
      rating: Number($('div.info tr.rating td.value a span.value').text() ?? 0),
      coverImage: $('div.info div.image div.container img').attr('src') ?? null,
      status:
        new Date($('div.info tr.year td.value span').last()?.text().trim()) >
        new Date()
          ? 'airing'
          : 'finished',
      totalEpisodes: Number($('div.info tr.type td.value span').html()),
      characters,
      airDate: {
        start: {
          month: null,
          day: null,
          year: new Date(
            $('div.info tr.year td.value span').first()?.text().trim(),
          ).getFullYear(),
          string: this.parseDate(startDate) ?? null,
        },
        end: {
          month: null,
          day: null,
          year: null,
          string: this.parseDate(endDate) ?? null,
        },
      },

      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  }

  public async getEpisodes(
    anime: FribbAnime,
  ): Promise<ProviderEpisode[] | undefined> {
    const aniDbId = anime.anidb_id

    if (!aniDbId) return undefined

    const data = await this.client.get(`anime/${aniDbId.toString()}`).text()
    const $ = load(data)

    const episodeList: {
      id: string
      title: string
      number: number
      duration: string
      airDate: number
    }[] = []

    $('div.episodes table#eplist tr').each((_i, el) => {
      if ($(el).find('td.id a abbr').attr('title') === 'Regular Episode') {
        episodeList.push({
          id: $(el).find('td.id a').attr('href') ?? '',
          number: Number($(el).find('td.id').text()),
          title: $(el).find('td.episode label').text()?.trim() ?? '', // The title attribute contains synonyms
          duration: $(el).find('td.duration').text(),
          airDate: new Date(
            $(el).find('td.date').attr('content') ?? '',
          ).getTime(),
        })
      }
    })

    const episodePromises = episodeList.map((episode) =>
      this.fetchEpisodeData(episode),
    )

    const episodes = await Promise.all(episodePromises)

    return episodes.filter(
      (episode) => episode !== undefined,
    ) as ProviderEpisode[]
  }

  async fetchEpisodeData(episode: {
    id: string
    title: string
    number: number
    duration: string
    airDate: number
  }): Promise<ProviderEpisode | undefined> {
    try {
      const response = await (
        await this.client.get(
          `${episode.id.startsWith('/') ? episode.id.slice(1) : episode.id}`,
          {
            headers: {
              Cookie: 'adbuin=1234567890-ehCL',
            },
          },
        )
      ).text()
      const $ = load(response)

      let description = $('div.desc div.summary').text()?.trim() || null
      description = description?.includes('\n\nSource: Crunchyroll')
        ? description.replaceAll('\n\nSource: Crunchyroll', '').trim()
        : description
      const rating = Number(
        $('div.info tr.rating td.value a span.value').text(),
      )

      return {
        id: episode.id,
        description,
        number: episode.number,
        rating,
        title: [
          {
            title: episode.title,
            languageCode: 'english',
          },
        ],

        createdAt: Date.now(),
        updatedAt:
          (Number.isNaN(
            new Date(
              $('div.info tr.date td.value span').text()?.trim() || '',
            ).getTime(),
          )
            ? undefined
            : new Date(
                $('div.info tr.date td.value span').text()?.trim() || '',
              ).getTime()) ?? Date.now(),
      }
    } catch {
      return undefined
    }
  }
}

export default Anidb
