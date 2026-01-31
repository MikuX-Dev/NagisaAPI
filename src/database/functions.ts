// biome-ignore assist/source/organizeImports: I have so much to deal with already, Politely fuck you.
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  like,
  lte,
  or,
  sql,
} from 'drizzle-orm'

import { keywordsNanoId, nanoid } from '../id-gen/nanoid'
import { db } from './db'

// TODO TAGS AND STUDIOS NEEDS TO HAVE THEIR OWN SCHEMA TOO.

import {
  episode,
  genre,
  info,
  infoToGenre,
  type EpisodeInsert,
  type InfoInsert,
} from './schema'

export async function addInfo(
  data: Omit<InfoInsert, 'id' | 'createdAt' | 'updatedAt'> & {
    genres: Array<{ id: number; name: string }>
  },
) {
  const now = Date.now()
  const infoId = nanoid()

  const { genres: genreData, ...infoData } = data

  const [insertedInfo] = await db
    .insert(info)
    .values({
      ...infoData,
      id: infoId,
      createdAt: now.toString(),
      updatedAt: now.toString(),
    })
    .returning()

  if (genreData.length > 0) {
    for (const genreItem of genreData) {
      await db
        .insert(genre)
        .values({
          id: keywordsNanoId(),
          name: genreItem.name,
        })
        .onConflictDoNothing()
    }

    const genreNames = genreData.map((g) => g.name)
    const existingGenres = await db
      .select()
      .from(genre)
      .where(inArray(genre.name, genreNames))

    const infoToGenreValues = existingGenres.map((g) => ({
      infoId: insertedInfo?.id,
      genreId: g.id,
    }))

    if (infoToGenreValues.length > 0) {
      const filteredValues = infoToGenreValues.filter(
        (v) => v.infoId !== undefined,
      ) as {
        infoId: string
        genreId: string
      }[]

      await db.insert(infoToGenre).values(filteredValues).onConflictDoNothing()
    }
  }

  return insertedInfo
}

export async function updateInfo(
  infoId: string,
  data: Partial<Omit<InfoInsert, 'id' | 'createdAt' | 'updatedAt'>> & {
    genres?: Array<{ id: number; name: string }>
  },
) {
  const now = Date.now()
  const { genres: genreData, ...infoData } = data

  const [updatedInfo] = await db
    .update(info)
    .set({
      ...infoData,
      updatedAt: now.toString(),
    })
    .where(eq(info.id, infoId))
    .returning()

  if (genreData && genreData.length > 0) {
    await db.delete(infoToGenre).where(eq(infoToGenre.infoId, infoId))

    for (const genreItem of genreData) {
      await db
        .insert(genre)
        .values({
          id: nanoid(),
          name: genreItem.name,
        })
        .onConflictDoNothing()
    }

    const genreNames = genreData.map((g) => g.name)
    const existingGenres = await db
      .select()
      .from(genre)
      .where(inArray(genre.name, genreNames))

    const infoToGenreValues = existingGenres.map((g) => ({
      infoId: updatedInfo?.id,
      genreId: g.id,
    }))

    if (infoToGenreValues.length > 0) {
      const filteredValues = infoToGenreValues.filter(
        (v) => v.infoId !== undefined,
      ) as {
        infoId: string
        genreId: string
      }[]

      await db.insert(infoToGenre).values(filteredValues).onConflictDoNothing()
    }
  }

  return updatedInfo
}

export async function getInfo(infoId: string) {
  const [infoResult] = await db.select().from(info).where(eq(info.id, infoId))

  if (!infoResult) {
    return null
  }

  // Get genres for this info
  const genreResults = await db
    .select({
      id: genre.id,
      name: genre.name,
    })
    .from(infoToGenre)
    .innerJoin(genre, eq(infoToGenre.genreId, genre.id))
    .where(eq(infoToGenre.infoId, infoId))

  return {
    ...infoResult,
    genres: genreResults,
  }
}

export async function addEpisodes(
  episodes: Array<Omit<EpisodeInsert, 'createdAt' | 'updatedAt'>>,
) {
  const now = Date.now()

  const episodesToInsert = episodes.map((ep) => ({
    ...ep,
    createdAt: now.toString(),
    updatedAt: now.toString(),
  }))

  const insertedEpisodes = await db
    .insert(episode)
    .values(episodesToInsert)
    .returning()

  return insertedEpisodes
}

export async function updateEpisodes(
  episodeId: string,
  infoId: string,
  data: Partial<
    Omit<EpisodeInsert, 'id' | 'infoId' | 'createdAt' | 'updatedAt'>
  >,
) {
  const now = Date.now()

  const [updatedEpisode] = await db
    .update(episode)
    .set({
      ...data,
      updatedAt: now.toString(),
    })
    .where(and(eq(episode.id, episodeId), eq(episode.infoId, infoId)))
    .returning()

  return updatedEpisode
}

export async function getEpisodes(
  infoId: string,
  options?: {
    limit?: number
    offset?: number
    orderBy?: 'asc' | 'desc'
  },
) {
  const limit = options?.limit ?? 100
  const offset = options?.offset ?? 0
  const orderBy = options?.orderBy ?? 'asc'

  const episodes = await db
    .select()
    .from(episode)
    .where(eq(episode.infoId, infoId))
    .orderBy(orderBy === 'asc' ? asc(episode.number) : desc(episode.number))
    .limit(limit)
    .offset(offset)

  return episodes
}

export async function getGenres() {
  const genres = await db.select().from(genre)
  return genres
}

export interface SearchOptions {
  query?: string
  tags?: Array<{ id: number; name: string }>
  status?: 'airing' | 'finished' | 'cancelled' | 'hiatus' | 'upcoming'
  season?: 'summer' | 'winter' | 'spring' | 'fall'
  format?:
    | 'tv show'
    | 'movie'
    | 'special'
    | 'ova'
    | 'ona'
    | 'music'
    | 'manga'
    | 'novel'
    | 'one shot'
  airDateStartYear?: number
  airDateEndYear?: number
  id?: string
  rating?: {
    min?: number
    max?: number
  }
  subCount?: {
    min?: number
    max?: number
  }
  dubCount?: {
    min?: number
    max?: number
  }
  totalEpisodes?: {
    min?: number
    max?: number
  }
  currentEpisode?: {
    min?: number
    max?: number
  }
  countryOfOrigin?: string
  slug?: string
  color?: string
  characterName?: string
  studioName?: string
  genreNames?: string[]
  limit?: number
  offset?: number
  orderBy?: 'createdAt' | 'updatedAt' | 'rating' | 'totalEpisodes'
  orderDirection?: 'asc' | 'desc'
}

export async function search(options: SearchOptions = {}) {
  const {
    query,
    tags,
    status,
    season,
    format,
    airDateStartYear,
    airDateEndYear,
    id,
    rating,
    subCount,
    dubCount,
    totalEpisodes,
    currentEpisode,
    countryOfOrigin,
    slug,
    color,
    characterName,
    studioName,
    genreNames,
    limit = 50,
    offset = 0,
    orderBy = 'createdAt',
    orderDirection = 'desc',
  } = options

  const conditions = []

  if (query) {
    conditions.push(
      or(
        sql`${info.titles}::text ILIKE ${`%${query}%`}`,
        like(info.slug, `%${query}%`),
        like(info.description, `%${query}%`),
      ),
    )
  }

  if (tags && tags.length > 0) {
    const tagNames = tags.map((t) => t.name)
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM jsonb_array_elements(${info.tags}) AS tag
        WHERE tag->>'name' = ANY(${tagNames})
      )`,
    )
  }

  if (status) {
    conditions.push(eq(info.status, status))
  }

  if (season) {
    conditions.push(eq(info.season, season))
  }

  if (format) {
    conditions.push(eq(info.format, format))
  }

  if (airDateStartYear) {
    conditions.push(
      sql`(${info.airDate}->>'start'->>'year')::int >= ${airDateStartYear}`,
    )
  }

  if (airDateEndYear) {
    conditions.push(
      sql`(${info.airDate}->>'end'->>'year')::int <= ${airDateEndYear}`,
    )
  }

  if (id) {
    conditions.push(eq(info.id, id))
  }

  if (rating?.min !== undefined) {
    conditions.push(gte(info.rating, rating.min))
  }
  if (rating?.max !== undefined) {
    conditions.push(lte(info.rating, rating.max))
  }

  if (subCount?.min !== undefined) {
    conditions.push(gte(info.subCount, subCount.min))
  }
  if (subCount?.max !== undefined) {
    conditions.push(lte(info.subCount, subCount.max))
  }

  if (dubCount?.min !== undefined) {
    conditions.push(gte(info.dubCount, dubCount.min))
  }
  if (dubCount?.max !== undefined) {
    conditions.push(lte(info.dubCount, dubCount.max))
  }

  if (totalEpisodes?.min !== undefined) {
    conditions.push(gte(info.totalEpisodes, totalEpisodes.min))
  }
  if (totalEpisodes?.max !== undefined) {
    conditions.push(lte(info.totalEpisodes, totalEpisodes.max))
  }

  if (currentEpisode?.min !== undefined) {
    conditions.push(gte(info.currentEpisode, currentEpisode.min))
  }
  if (currentEpisode?.max !== undefined) {
    conditions.push(lte(info.currentEpisode, currentEpisode.max))
  }

  if (countryOfOrigin) {
    conditions.push(eq(info.countryOfOrigin, countryOfOrigin))
  }

  if (slug) {
    conditions.push(eq(info.slug, slug))
  }

  if (color) {
    conditions.push(eq(info.color, color))
  }

  if (characterName) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM jsonb_array_elements(${info.characters}) AS character
        WHERE character->>'name' ILIKE ${`%${characterName}%`}
      )`,
    )
  }

  if (studioName) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM jsonb_array_elements(${info.studio}) AS studio
        WHERE studio->>'name' ILIKE ${`%${studioName}%`}
      )`,
    )
  }

  if (genreNames && genreNames.length > 0) {
    const genreRecords = await db
      .select()
      .from(genre)
      .where(inArray(genre.name, genreNames))
    const genreIds = genreRecords.map((g) => g.id)

    if (genreIds.length > 0) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${infoToGenre}
          WHERE ${infoToGenre.infoId} = ${info.id}
          AND ${infoToGenre.genreId} = ANY(${genreIds})
        )`,
      )
    }
  }

  let query_builder =
    conditions.length > 0
      ? db
          .select()
          .from(info)
          .where(and(...conditions))
      : db.select().from(info)

  const orderColumn =
    orderBy === 'createdAt'
      ? info.createdAt
      : orderBy === 'updatedAt'
        ? info.updatedAt
        : orderBy === 'rating'
          ? info.rating
          : orderBy === 'totalEpisodes'
            ? info.totalEpisodes
            : info.createdAt

  // @ts-expect-error meh
  query_builder = query_builder
    .orderBy(orderDirection === 'asc' ? asc(orderColumn) : desc(orderColumn))
    .limit(limit)
    .offset(offset)

  const results = await query_builder

  const resultsWithGenres = await Promise.all(
    results.map(async (infoItem) => {
      const genreResults = await db
        .select({
          id: genre.id,
          name: genre.name,
        })
        .from(infoToGenre)
        .innerJoin(genre, eq(infoToGenre.genreId, genre.id))
        .where(eq(infoToGenre.infoId, infoItem.id))

      return {
        ...infoItem,
        genres: genreResults,
      }
    }),
  )

  return resultsWithGenres
}

await Bun.write(
  'db-info.json',
  JSON.stringify(
    await getInfo('x5kc4dvc09qxsetw'),
    (_k, v) => typeof v === 'bigint' ? v.toString() : v,
    2,
  ),
)
