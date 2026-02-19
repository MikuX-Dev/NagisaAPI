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

import {
  episode,
  genre,
  info,
  infoToGenre,
  infoToStudio,
  infoToTag,
  studio,
  tag,
  type EpisodeInsert,
  type InfoInsert,
} from './schema'
import type { DatabaseEpisode } from '../types/anime'

type KeywordTable = typeof genre | typeof tag | typeof studio
type JunctionTable = typeof infoToGenre | typeof infoToTag | typeof infoToStudio

async function upsertAndLink(
  keywordTable: KeywordTable,
  junctionTable: JunctionTable,
  infoId: string,
  names: string[],
) {
  if (names.length === 0) return

  for (const name of names) {
    await db
      .insert(keywordTable)
      .values({ id: keywordsNanoId(), name })
      .onConflictDoNothing()
  }

  const existing = await db
    .select({ id: keywordTable.id })
    .from(keywordTable)
    .where(inArray(keywordTable.name, names))

  if (existing.length === 0) return

  const rows = existing.map((row) => {
    if (junctionTable === infoToGenre) return { infoId, genreId: row.id }
    if (junctionTable === infoToTag) return { infoId, tagId: row.id }
    return { infoId, studioId: row.id }
  })

  await db.insert(junctionTable).values(rows).onConflictDoNothing()
}
async function getLinkedKeywords(
  keywordTable: KeywordTable,
  junctionTable: JunctionTable,
  infoId: string,
) {
  const fkColumn =
    junctionTable === infoToGenre
      ? infoToGenre.genreId
      : junctionTable === infoToTag
        ? infoToTag.tagId
        : infoToStudio.studioId

  return db
    .select({ id: keywordTable.id, name: keywordTable.name })
    .from(junctionTable)
    .innerJoin(keywordTable, eq(fkColumn, keywordTable.id))
    .where(eq(junctionTable.infoId, infoId))
}

export async function addInfo(
  data: Omit<InfoInsert, 'id' | 'createdAt' | 'updatedAt'> & {
    genres: Array<{ id: number; name: string }>
    tags: Array<{ id: number; name: string }>
    studios: Array<{ id: number; name: string }>
  },
) {
  const now = Date.now()
  const infoId = nanoid()

  const {
    genres: genreData,
    tags: tagData,
    studios: studioData,
    ...infoData
  } = data

  const [insertedInfo] = await db
    .insert(info)
    .values({
      ...infoData,
      id: infoId,
      createdAt: now.toString(),
      updatedAt: now.toString(),
    })
    .onConflictDoUpdate({
      target: info.id,
      set: {
        externalIds: data.externalIds,
        updatedAt: Date.now().toString(),
      },
    })
    .returning()

  await upsertAndLink(
    genre,
    infoToGenre,
    infoId,
    genreData.map((g) => g.name),
  )
  await upsertAndLink(
    tag,
    infoToTag,
    infoId,
    tagData.map((t) => t.name),
  )
  await upsertAndLink(
    studio,
    infoToStudio,
    infoId,
    studioData.map((s) => s.name),
  )

  return insertedInfo
}

export async function updateInfo(
  infoId: string,
  data: Partial<Omit<InfoInsert, 'id' | 'createdAt' | 'updatedAt'>> & {
    genres?: Array<{ id: number; name: string }>
    tags?: Array<{ id: number; name: string }>
    studios?: Array<{ id: number; name: string }>
  },
) {
  const now = Date.now()
  const {
    genres: genreData,
    tags: tagData,
    studios: studioData,
    ...infoData
  } = data

  const [updatedInfo] = await db
    .update(info)
    .set({
      ...infoData,
      updatedAt: now.toString(),
    })
    .where(eq(info.id, infoId))
    .returning()

  if (genreData) {
    await db.delete(infoToGenre).where(eq(infoToGenre.infoId, infoId))
    await upsertAndLink(
      genre,
      infoToGenre,
      infoId,
      genreData.map((g) => g.name),
    )
  }

  if (tagData) {
    await db.delete(infoToTag).where(eq(infoToTag.infoId, infoId))
    await upsertAndLink(
      tag,
      infoToTag,
      infoId,
      tagData.map((t) => t.name),
    )
  }

  if (studioData) {
    await db.delete(infoToStudio).where(eq(infoToStudio.infoId, infoId))
    await upsertAndLink(
      studio,
      infoToStudio,
      infoId,
      studioData.map((s) => s.name),
    )
  }

  return updatedInfo
}

export async function getInfo(infoId: string) {
  const [infoResult] = await db.select().from(info).where(eq(info.id, infoId))

  if (!infoResult) {
    return null
  }

  const [genres, tags, studios] = await Promise.all([
    getLinkedKeywords(genre, infoToGenre, infoId),
    getLinkedKeywords(tag, infoToTag, infoId),
    getLinkedKeywords(studio, infoToStudio, infoId),
  ])

  return {
    ...infoResult,
    genres,
    tags,
    studios,
  }
}

export async function addEpisodes(
  episodes: Array<Omit<EpisodeInsert, 'createdAt' | 'updatedAt' | 'id'>>,
) {
  const now = Date.now()

  const episodesToInsert = episodes.map((ep) => ({
    ...ep,
    id: nanoid(32),
    createdAt: now.toString(),
    updatedAt: now.toString(),
  }))

  const insertedEpisodes = await db
    .insert(episode)
    .values(episodesToInsert)
    .onConflictDoUpdate({
      target: [episode.infoId, episode.number],
      set: {
        titles: sql`EXCLUDED.titles`,
        title: sql`EXCLUDED.title`,
        thumbnailImage: sql`EXCLUDED.thumbnail_image`,
        preview: sql`EXCLUDED.preview`,
        description: sql`EXCLUDED.description`,
        rating: sql`EXCLUDED.rating`,
        filler: sql`EXCLUDED.filler`,
        recap: sql`EXCLUDED.recap`,
        runtime: sql`EXCLUDED.runtime`,
        ago: sql`EXCLUDED.ago`,
        providers: sql`EXCLUDED.providers`,
        updatedAt: sql`EXCLUDED.updated_at`,
      },
    })
    .returning()

  return insertedEpisodes
}

export async function updateEpisodes(
  episodeId: string,
  _infoId: string,
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
    .where(eq(episode.id, episodeId))
    .returning()

  return updatedEpisode
}

export async function getEpisodes(
  infoId: string,
  options?: {
    limit?: number
    offset?: number
    orderBy?: 'asc' | 'desc'
    full?: boolean
  },
): Promise<DatabaseEpisode[]> {
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

  if (options?.full) {
    return episodes
  }

  return episodes.map((ep) => ({
    ...ep,
    providers: ep.providers.map(({ id, episodeId, ...rest }) => rest),
  }))
}

export async function getGenres() {
  return db.select().from(genre)
}

export async function getTags() {
  return db.select().from(tag)
}

export async function getStudios() {
  return db.select().from(studio)
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
  tagNames?: string[]
  limit?: number
  offset?: number
  orderBy?: 'createdAt' | 'updatedAt' | 'rating' | 'totalEpisodes'
  orderDirection?: 'asc' | 'desc'
  fuzzyThreshold?: number
}

export async function search(options: SearchOptions = {}) {
  const {
    query,
    tags: tagFilter,
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
    tagNames,
    limit = 50,
    offset = 0,
    orderBy = 'relevance',
    orderDirection = 'desc',
    fuzzyThreshold = 0.8,
  } = options

  const conditions = []

  if (query) {
    conditions.push(
      or(
        sql`${info.titles}::text ILIKE ${`%${query}%`}`,
        like(info.slug, `%${query}%`),
        like(info.description, `%${query}%`),
        sql`EXISTS (
          SELECT 1 FROM jsonb_array_elements(${info.titles}) AS title_obj
          WHERE jaro_winkler(LOWER(title_obj->>'title'), LOWER(${query})) >= ${fuzzyThreshold}
        )`,
        sql`jaro_winkler(${info.slug}, ${query}) >= ${fuzzyThreshold}`,
      ),
    )
  }

  if (tagFilter && tagFilter.length > 0) {
    const tagNameList = tagFilter.map((t) => t.name)
    const tagRecords = await db
      .select()
      .from(tag)
      .where(inArray(tag.name, tagNameList))
    const tagIds = tagRecords.map((t) => t.id)

    if (tagIds.length > 0) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${infoToTag}
          WHERE ${infoToTag.infoId} = ${info.id}
          AND ${infoToTag.tagId} = ANY(${tagIds})
        )`,
      )
    }
  }

  if (status) conditions.push(eq(info.status, status))
  if (season) conditions.push(eq(info.season, season))
  if (format) conditions.push(eq(info.format, format))

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
  if (id) conditions.push(eq(info.id, id))

  if (rating?.min !== undefined) conditions.push(gte(info.rating, rating.min))
  if (rating?.max !== undefined) conditions.push(lte(info.rating, rating.max))

  if (subCount?.min !== undefined)
    conditions.push(gte(info.subCount, subCount.min))
  if (subCount?.max !== undefined)
    conditions.push(lte(info.subCount, subCount.max))

  if (dubCount?.min !== undefined)
    conditions.push(gte(info.dubCount, dubCount.min))
  if (dubCount?.max !== undefined)
    conditions.push(lte(info.dubCount, dubCount.max))

  if (totalEpisodes?.min !== undefined)
    conditions.push(gte(info.totalEpisodes, totalEpisodes.min))
  if (totalEpisodes?.max !== undefined)
    conditions.push(lte(info.totalEpisodes, totalEpisodes.max))

  if (currentEpisode?.min !== undefined)
    conditions.push(gte(info.currentEpisode, currentEpisode.min))
  if (currentEpisode?.max !== undefined)
    conditions.push(lte(info.currentEpisode, currentEpisode.max))

  if (countryOfOrigin)
    conditions.push(eq(info.countryOfOrigin, countryOfOrigin))
  if (slug) conditions.push(eq(info.slug, slug))
  if (color) conditions.push(eq(info.color, color))

  if (characterName) {
    conditions.push(
      or(
        sql`EXISTS (
          SELECT 1 FROM jsonb_array_elements(${info.characters}) AS character
          WHERE character->>'name' ILIKE ${`%${characterName}%`}
        )`,
        sql`EXISTS (
          SELECT 1 FROM jsonb_array_elements(${info.characters}) AS character
          WHERE jaro_winkler(LOWER(character->>'name'), LOWER(${characterName})) >= ${fuzzyThreshold}
        )`,
      ),
    )
  }

  if (studioName) {
    const studioRecords = await db
      .select()
      .from(studio)
      .where(
        or(
          like(studio.name, `%${studioName}%`),
          sql`jaro_winkler(LOWER(${studio.name}), LOWER(${studioName})) >= ${fuzzyThreshold}`,
        ),
      )
    const studioIds = studioRecords.map((s) => s.id)

    if (studioIds.length > 0) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${infoToStudio}
          WHERE ${infoToStudio.infoId} = ${info.id}
          AND ${infoToStudio.studioId} = ANY(${studioIds})
        )`,
      )
    }
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

  if (tagNames && tagNames.length > 0) {
    const tagRecords = await db
      .select()
      .from(tag)
      .where(inArray(tag.name, tagNames))
    const tagIds = tagRecords.map((t) => t.id)
    if (tagIds.length > 0) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${infoToTag}
          WHERE ${infoToTag.infoId} = ${info.id}
          AND ${infoToTag.tagId} = ANY(${tagIds})
        )`,
      )
    }
  }

  const similarityScoreSql = query
    ? sql<number>`(
        SELECT MAX(jaro_winkler(LOWER(title_obj->>'title'), LOWER(${query})))
        FROM jsonb_array_elements(${info.titles}) AS title_obj
      )`
    : sql<number>`0`

  let query_builder = db
    .select({
      slug: info.slug,
      id: info.id,
      title: info.title,
      titles: info.titles,
      coverImage: info.coverImage,
      bannerImage: info.bannerImage,
      logoImage: info.logoImage,
      airDate: info.airDate,
      description: info.description,
      color: info.color,
      status: info.status,
      format: info.format,
      season: info.season,
      currentEpisode: info.currentEpisode,
      subCount: info.subCount,
      dubCount: info.dubCount,
      ageRating: info.ageRating,
      totalEpisodes: info.totalEpisodes,
      rating: info.rating,
      similarityScore: similarityScoreSql,
    })
    .from(info)

  if (conditions.length > 0) {
    // @ts-expect-error Drizzle sometimes complains about spread conditions
    query_builder = query_builder.where(and(...conditions))
  }

  const orderColumn =
    orderBy === 'createdAt'
      ? info.createdAt
      : orderBy === 'updatedAt'
        ? info.updatedAt
        : orderBy === 'rating'
          ? info.rating
          : orderBy === 'totalEpisodes'
            ? info.totalEpisodes
            : orderBy === 'relevance'
              ? similarityScoreSql
              : similarityScoreSql

  // @ts-expect-error TS might complain about complex order types
  query_builder = query_builder
    .orderBy(orderDirection === 'asc' ? asc(orderColumn) : desc(orderColumn))
    .limit(limit)
    .offset(offset)

  const results = await query_builder

  return results
}
export const getAllAnilistIds = async (): Promise<number[]> => {
  const result = await db
    .select({
      anilistId: sql<string>`${info.externalIds}->>'anilistId'`,
    })
    .from(info)

  return result
    .map((row) => (row.anilistId ? parseInt(row.anilistId, 10) : null))
    .filter((id): id is number => id !== null && !Number.isNaN(id))
}

export const getAllAnimeIdAndTitle = async (
  offset: number = 0,
  limit: number = 100,
): Promise<{
  data: Array<{ id: string; title: string | null }>
  total: number
  offset: number
  limit: number
}> => {
  const [result, countResult] = await Promise.all([
    db
      .select({
        id: info.id,
        title: sql<string | null>`${info.titles}->0->>'title'`,
      })
      .from(info)
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(info),
  ])

  return {
    data: result,
    total: countResult[0]?.count ?? 0,
    offset,
    limit,
  }
}

export const getAnimeCount = async (): Promise<number> => {
  return await db.$count(info)
}

export const getAnimeFromAnilistIds = async (
  anilistIds: number[],
): Promise<{
  found: Array<
    Omit<
      typeof info.$inferSelect,
      | 'externalIds'
      | 'synonyms'
      | 'relations'
      | 'countryOfOrigin'
      | 'characters'
      | 'artwork'
      | 'createdAt'
      | 'updatedAt'
    >
  >
  unavailable: number[]
}> => {
  if (anilistIds.length === 0) return { found: [], unavailable: [] }

  const anilistIdStrings = anilistIds.map(String)

  const result = await db
    .select({
      slug: info.slug,
      id: info.id,
      title: info.title,
      titles: info.titles,
      coverImage: info.coverImage,
      bannerImage: info.bannerImage,
      logoImage: info.logoImage,
      airDate: info.airDate,
      description: info.description,
      color: info.color,
      coverColor: info.coverColor,
      status: info.status,
      format: info.format,
      season: info.season,
      currentEpisode: info.currentEpisode,
      subCount: info.subCount,
      dubCount: info.dubCount,
      ageRating: info.ageRating,
      totalEpisodes: info.totalEpisodes,
      rating: info.rating,
      externalIds: info.externalIds,
    })
    .from(info)
    .where(
      sql`${info.externalIds}->>'anilistId' IN (${sql.join(
        anilistIdStrings.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    )

  const animeMap = new Map<number, (typeof result)[0]>()

  result.forEach((anime) => {
    const id = (anime.externalIds as { anilistId: string })?.anilistId
    if (id) {
      const numericId = Number.parseInt(id, 10)
      if (!animeMap.has(numericId)) {
        animeMap.set(numericId, anime)
      }
    }
  })

  const found = []
  const unavailable: number[] = []

  for (const id of anilistIds) {
    const match = animeMap.get(id)
    if (match) {
      const { externalIds, ...cleanMatch } = match
      found.push(cleanMatch)
    } else {
      unavailable.push(id)
    }
  }

  return {
    found,
    unavailable,
  }
}

export async function nukeAllAnimeEpisodes(): Promise<number> {
  const result = await db.delete(episode)

  const deletedCount = result.rowCount ?? 0

  console.log(`💥 Nuked ${deletedCount} anime episodes from existence`)

  return deletedCount
}

// await Bun.write(
//   'db-info.json',
//   JSON.stringify(
//     await getInfo('qp8b9arkwa1ol5sz'),
//     (_k, v) => (typeof v === 'bigint' ? v.toString() : v),
//     2,
//   ),
// )
