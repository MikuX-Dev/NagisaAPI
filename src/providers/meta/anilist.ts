import crypto from 'node:crypto'
import ky from 'ky'

import { mapAniListFormatToIFormat } from '../../helper/map-format'
import { mapAnilistStatus } from '../../helper/map-status'
import type {
  ICharacter,
  ISeason,
  IVoiceActor,
  RelationType,
} from '../../types/anime'
import type {
  AnilistMediaFormat,
  AnilistMediaStatus,
  FribbAnime,
  IRelation,
  ProviderInfo,
} from '../../types/provider'

import { MetaBase } from '../base/meta'

class Anilist extends MetaBase {
  override name: string = 'anilist'
  override url: string = 'https://graphql.anilist.co'
  public corsProxies: string[] = [
    'https://proxy.sohom829.workers.dev/',
    'https://cors-tube.vercel.app?url=',
  ]

  private getProxiedUrl() {
    const url = this.url
    const randomNumber = crypto.randomBytes(4).readUInt32BE() / 0xffffffff

    if (randomNumber < 0.5) {
      const proxyIndex =
        crypto.randomBytes(4).readUInt32BE() % this.corsProxies.length
      return `${this.corsProxies[proxyIndex]}${url}`
    } else {
      return url
    }
  }

  override async getInfo(anime: FribbAnime): Promise<ProviderInfo | undefined> {
    const anilist_id = anime.anilist_id

    if (!anilist_id) return undefined

    const res = await ky.post(this.getProxiedUrl(), {
      json: {
        query: this.query,
        variables: {
          mediaId: anilist_id,
        },
      },
    })

    const xRetryAfter = res.headers.get('Retry-After')
    const xRateLimit = res.headers.get('X-RateLimit-Limit')
    const xRateLimitRemaining = res.headers.get('X-RateLimit-Remaining')

    const data = await res.json<{ data: AnimeInfoResponse }>()

    const media = data.data.Media
    let currentEpisode = 0
    if (media?.nextAiringEpisode) {
      currentEpisode = media.nextAiringEpisode.episode - 1
    } else if (
      media?.episodes &&
      (media.status === 'FINISHED' || media.status === 'CANCELLED')
    ) {
      currentEpisode = media.episodes
    }

    const characters: ICharacter[] =
      media?.characters?.edges?.map(
        (char) =>
          ({
            name: char.node.name.full ?? null,
            role: char.role ?? null,
            image: char.node.image.large ?? char.node.image.medium ?? null,
            voiceActor: {
              name:
                char.voiceActors?.find(
                  (voice) =>
                    voice.languageV2 === 'Japanese' || char.voiceActors?.[0],
                )?.name.full ?? null,
              image:
                char.voiceActors?.find(
                  (voice) =>
                    voice.languageV2 === 'Japanese' || char.voiceActors?.[0],
                )?.image.large ??
                char.voiceActors?.find(
                  (voice) =>
                    voice.languageV2 === 'Japanese' || char.voiceActors?.[0],
                )?.image.medium ??
                null,
            } as IVoiceActor,
          }) as ICharacter,
      ) ?? []
    const relations: IRelation[] =
      media?.relations?.edges?.map(
        (rel) =>
          ({
            id: rel.node.id,
            titles: [
              {
                languageCode: 'english',
                title: rel.node.title.english,
              },
              {
                languageCode: 'japanese',
                title: rel.node.title.native,
              },
              {
                languageCode: 'romaji',
                title: rel.node.title.romaji,
              },
            ],
            type: rel.node.type,
            relationType: rel.relationType,
            format: rel.node.format,
          }) as IRelation,
      ) ?? []

    return {
      id: media?.id.toString(),
      titles: [
        {
          languageCode: 'english',
          title: media?.title.english,
        },
        {
          languageCode: 'japanese',
          title: media?.title.native,
        },
        {
          languageCode: 'romaji',
          title: media?.title.romaji,
        },
      ],
      bannerImage: media?.bannerImage,
      airDate: {
        start: media?.startDate ?? null,
        end: media?.endDate ?? null,
      },
      coverImage:
        media?.coverImage?.extraLarge ??
        media?.coverImage?.large ??
        media?.coverImage?.medium ??
        null,
      color: media?.coverImage?.color ?? null,
      format: mapAniListFormatToIFormat(media?.format ?? null),
      status: mapAnilistStatus(media?.status ?? null),
      season: media?.season?.toLowerCase() as ISeason,
      countryOfOrigin: media?.countryOfOrigin,
      genres: media?.genres?.map((genre) => ({
        id: 0,
        name: genre,
      })),
      totalEpisodes:
        media?.episodes ?? media?.nextAiringEpisode?.episode ?? null,
      characters,
      relations,
      tags: media?.tags?.map((tag) => ({
        id: tag.id,
        name: tag.name,
      })),
      currentEpisode,

      createdAt: Date.now(),
      updatedAt: Date.now(),

      ratelimit: {
        remaining: xRateLimitRemaining ? Number(xRateLimitRemaining) : null,
        limit: xRateLimit ? Number(xRateLimit) : null,
        retryAfter: xRetryAfter ? Number(xRetryAfter) : null,
      },
    } as ProviderInfo
  }

  private query = `query AnimeInfo($mediaId: Int) {
  Media(id: $mediaId) {
    id
    idMal
    season
    description
    bannerImage
    countryOfOrigin
    coverImage {
      extraLarge
      large
      medium
      color
    }
    genres
    format
    episodes
    status
    tags {
      name
      id
    }
    title {
      romaji
      english
      native
      userPreferred
    }
    characters {
      edges {
        node {
          image {
            large
            medium
          }
          name {
            full
          }
        }
        role
        voiceActors {
          image {
            large
            medium
          }
          name {
            full
          }
          languageV2
        }
      }
    }
    relations {
      edges {
        relationType
        node {
          id
          title {
            romaji
            english
            native
            userPreferred
          }
          format
          type
        }
      }
    }
    startDate {
      year
      month
      day
    }
    endDate {
      year
      month
      day
    }
    nextAiringEpisode {
      id
      airingAt
      timeUntilAiring
      episode
      mediaId
    }
  }
}
`
}

export interface AnimeInfoResponse {
  Media: Media | null
}

export interface Media {
  id: number
  idMal: number | null
  season: string | null
  description: string | null
  bannerImage: string | null
  countryOfOrigin: string | null
  coverImage: CoverImage | null
  genres: string[] | null
  format: AnilistMediaFormat | null
  episodes: number | null
  status: AnilistMediaStatus | null
  tags: Tag[] | null
  title: Title
  characters: CharacterConnection | null
  relations: RelationConnection | null
  startDate: FuzzyDate | null
  endDate: FuzzyDate | null
  nextAiringEpisode: NextAiringEpisode | null
}

export interface CoverImage {
  extraLarge: string | null
  large: string | null
  medium: string | null
  color: string | null
}

export interface Title {
  romaji: string | null
  english: string | null
  native: string | null
  userPreferred: string
}

export interface Tag {
  id: number
  name: string
}

export interface CharacterConnection {
  edges: CharacterEdge[] | null
}

export interface CharacterEdge {
  node: Character
  role: string | null
  voiceActors: Staff[] | null
}

export interface Character {
  image: {
    large: string | null
    medium: string | null
  }
  name: {
    full: string | null
  }
}

export interface Staff {
  image: {
    large: string | null
    medium: string | null
  }
  name: {
    full: string | null
  }
  languageV2: string | null
}

export interface RelationConnection {
  edges: RelationEdge[] | null
}

export interface RelationEdge {
  relationType: RelationType | null
  node: {
    id: number
    title: Title
    format: AnilistMediaFormat | null
    type: string | null
  }
}

export interface FuzzyDate {
  year: number | null
  month: number | null
  day: number | null
}

export interface NextAiringEpisode {
  id: number
  airingAt: number
  timeUntilAiring: number
  episode: number
  mediaId: number
}

export default Anilist
