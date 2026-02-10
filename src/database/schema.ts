import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  unique,
} from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import { keywordsNanoId, nanoid } from '../id-gen/nanoid'

export const info = pgTable(
  'info',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => nanoid()),
    slug: text('slug').notNull(),
    title: text('string').notNull(),
    externalIds: jsonb('external_ids').$type<{ [x: string]: string }>(),
    titles: jsonb('titles')
      .notNull()
      .$type<Array<{ languageCode: string; title: string | null }>>(),
    synonyms: jsonb('synonyms').notNull().$type<string[]>(),
    coverImage: text('cover_image'),
    bannerImage: text('banner_image'),
    logoImage: text('logo_image'),
    color: text('color'),
    coverColor: text('cover_color'),
    description: text('description'),
    airDate: jsonb('air_date').$type<{
      start: {
        month: number | null
        year: number | null
        day: number | null
        string: string | null
      }
      end: {
        month: number | null
        year: number | null
        day: number | null
        string: string | null
      }
    } | null>(),
    status: text('status').$type<
      'airing' | 'finished' | 'cancelled' | 'hiatus' | 'upcoming' | null
    >(),
    format: text('format').$type<
      | 'tv show'
      | 'movie'
      | 'special'
      | 'ova'
      | 'ona'
      | 'music'
      | 'manga'
      | 'novel'
      | 'one shot'
      | null
    >(),
    season: text('season').$type<
      'summer' | 'winter' | 'spring' | 'fall' | null
    >(),
    relations: jsonb('relations').$type<Array<{
      relationType:
        | 'PREQUEL'
        | 'SEQUEL'
        | 'ALTERNATIVE'
        | 'SIDE_STORY'
        | 'PARENT'
        | 'SPIN_OFF'
        | 'OTHER'
        | 'ADAPTATION'
        | null
      id: number
      titles: Array<{ languageCode: string; title: string | null }>
      format:
        | 'TV'
        | 'TV_SHORT'
        | 'MOVIE'
        | 'SPECIAL'
        | 'OVA'
        | 'ONA'
        | 'MUSIC'
        | 'MANGA'
        | 'NOVEL'
        | 'ONE_SHOT'
        | null
      type: string | null
    }> | null>(),
    currentEpisode: integer('current_episode'),
    countryOfOrigin: text('country_of_origin'),
    totalEpisodes: integer('total_episodes'),
    subCount: integer('sub_count'),
    dubCount: integer('dub_count'),
    rating: integer('rating'),
    ageRating: text('age_rating'),
    characters: jsonb('characters').notNull().$type<
      Array<{
        image: string | null
        name: string | null
        role: string | null
        voiceActor: {
          image: string | null
          name: string | null
        }
      }>
    >(),
    artwork: jsonb('artwork').notNull().$type<
      Array<{
        type:
          | 'banner'
          | 'poster'
          | 'clear_logo'
          | 'top_banner'
          | 'icon'
          | 'clear_art'
        image: string
        providerId: string
      }>
    >(),
    createdAt: text('created_at').notNull().$type<string>(),
    updatedAt: text('updated_at').notNull().$type<string>(),
  },
  (table) => [
    index('slug_idx').on(table.slug),
    index('status_idx').on(table.status),
  ],
)

export const genre = pgTable(
  'genre',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => keywordsNanoId()),
    name: text('name').notNull().unique(),
  },
  (table) => [index('genre_name_idx').on(table.name)],
)

export const infoToGenre = pgTable(
  'info_to_genre',
  {
    infoId: text('info_id')
      .notNull()
      .references(() => info.id, { onDelete: 'cascade' }),
    genreId: text('genre_id')
      .notNull()
      .references(() => genre.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.infoId, table.genreId] }),
    index('info_to_genre_info_id_idx').on(table.infoId),
    index('info_to_genre_genre_id_idx').on(table.genreId),
  ],
)

export const tag = pgTable(
  'tag',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => keywordsNanoId()),
    name: text('name').notNull().unique(),
  },
  (table) => [index('tag_name_idx').on(table.name)],
)

export const infoToTag = pgTable(
  'info_to_tag',
  {
    infoId: text('info_id')
      .notNull()
      .references(() => info.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tag.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.infoId, table.tagId] }),
    index('info_to_tag_info_id_idx').on(table.infoId),
    index('info_to_tag_tag_id_idx').on(table.tagId),
  ],
)

export const studio = pgTable(
  'studio',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => keywordsNanoId()),
    name: text('name').notNull().unique(),
  },
  (table) => [index('studio_name_idx').on(table.name)],
)

export const infoToStudio = pgTable(
  'info_to_studio',
  {
    infoId: text('info_id')
      .notNull()
      .references(() => info.id, { onDelete: 'cascade' }),
    studioId: text('studio_id')
      .notNull()
      .references(() => studio.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.infoId, table.studioId] }),
    index('info_to_studio_info_id_idx').on(table.infoId),
    index('info_to_studio_studio_id_idx').on(table.studioId),
  ],
)

export const episode = pgTable(
  'episode',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => nanoid(32))
      .notNull(),
    infoId: text('info_id')
      .notNull()
      .references(() => info.id, { onDelete: 'cascade' }),
    titles: jsonb('titles').$type<Array<{
      languageCode: string
      title: string | null
    }> | null>(),
    thumbnailImage: text('thumbnail_image'),
    preview: text('preview'),
    description: text('description'),
    number: integer('number').notNull(),
    rating: integer('rating'),
    filler: boolean('filler').notNull(),
    recap: boolean('recap').notNull(),
    runtime: integer('runtime'),
    ago: text('ago'),
    providers: jsonb('providers').notNull().$type<
      Array<{
        providerType: Array<'SUB' | 'DUB' | 'H-SUB'>
        providerName: string
        id: string
        episodeId: string
      }>
    >(),
    createdAt: text('created_at').notNull().$type<string>(),
    updatedAt: text('updated_at').notNull().$type<string>(),
  },
  (table) => [
    unique('episode_info_id_number_unique').on(table.infoId, table.number),
    index('episode_info_id_idx').on(table.infoId),
    index('episode_number_idx').on(table.number),
  ],
)

const titleSchema = z.object({
  languageCode: z.string(),
  title: z.string().nullable(),
})

const dateSchema = z.object({
  month: z.number().nullable(),
  year: z.number().nullable(),
  day: z.number().nullable(),
  string: z.string().nullable(),
})

const airDateSchema = z
  .object({
    start: dateSchema,
    end: dateSchema,
  })
  .nullable()

const relationSchema = z.object({
  relationType: z
    .enum([
      'PREQUEL',
      'SEQUEL',
      'ALTERNATIVE',
      'SIDE_STORY',
      'PARENT',
      'SPIN_OFF',
      'OTHER',
    ])
    .nullable(),
  id: z.number(),
  titles: z.array(titleSchema),
  format: z
    .enum([
      'TV',
      'TV_SHORT',
      'MOVIE',
      'SPECIAL',
      'OVA',
      'ONA',
      'MUSIC',
      'MANGA',
      'NOVEL',
      'ONE_SHOT',
    ])
    .nullable(),
  type: z.string().nullable(),
})

const voiceActorSchema = z.object({
  image: z.string().nullable(),
  name: z.string().nullable(),
})

const characterSchema = z.object({
  image: z.string().nullable(),
  name: z.string().nullable(),
  role: z.string().nullable(),
  voiceActor: voiceActorSchema,
})

const artworkSchema = z.object({
  type: z.enum([
    'banner',
    'poster',
    'clear_logo',
    'top_banner',
    'icon',
    'clear_art',
  ]),
  image: z.string(),
  providerId: z.string(),
})

const providerSchema = z.object({
  providerType: z.array(z.enum(['SUB', 'DUB', 'H-SUB'])),
  providerName: z.string(),
})

export const insertInfoSchema = createInsertSchema(info, {
  titles: z.array(titleSchema),
  synonyms: z.array(z.string()),
  externalIds: z.record(z.string(), z.string()),
  airDate: airDateSchema,
  status: z
    .enum(['airing', 'finished', 'cancelled', 'hiatus', 'upcoming'])
    .nullable(),
  format: z
    .enum([
      'tv show',
      'movie',
      'special',
      'ova',
      'ona',
      'music',
      'manga',
      'novel',
      'one shot',
    ])
    .nullable(),
  season: z.enum(['summer', 'winter', 'spring', 'fall']).nullable(),
  relations: z.array(relationSchema).nullable(),
  characters: z.array(characterSchema),
  artwork: z.array(artworkSchema),
})

export const selectInfoSchema = createSelectSchema(info, {
  titles: z.array(titleSchema),
  synonyms: z.array(z.string()),
  airDate: airDateSchema,
  status: z
    .enum(['airing', 'finished', 'cancelled', 'hiatus', 'upcoming'])
    .nullable(),
  format: z
    .enum([
      'tv show',
      'movie',
      'special',
      'ova',
      'ona',
      'music',
      'manga',
      'novel',
      'one shot',
    ])
    .nullable(),
  season: z.enum(['summer', 'winter', 'spring', 'fall']).nullable(),
  relations: z.array(relationSchema).nullable(),
  characters: z.array(characterSchema),
  artwork: z.array(artworkSchema),
})

export const insertGenreSchema = createInsertSchema(genre)
export const selectGenreSchema = createSelectSchema(genre)

export const insertInfoToGenreSchema = createInsertSchema(infoToGenre)
export const selectInfoToGenreSchema = createSelectSchema(infoToGenre)

export const insertTagSchema = createInsertSchema(tag)
export const selectTagSchema = createSelectSchema(tag)

export const insertInfoToTagSchema = createInsertSchema(infoToTag)
export const selectInfoToTagSchema = createSelectSchema(infoToTag)

export const insertStudioSchema = createInsertSchema(studio)
export const selectStudioSchema = createSelectSchema(studio)

export const insertInfoToStudioSchema = createInsertSchema(infoToStudio)
export const selectInfoToStudioSchema = createSelectSchema(infoToStudio)

export const insertEpisodeSchema = createInsertSchema(episode, {
  titles: z.array(titleSchema).nullable(),
  providers: z.array(providerSchema),
})

export const selectEpisodeSchema = createSelectSchema(episode, {
  titles: z.array(titleSchema).nullable(),
  providers: z.array(providerSchema),
})

export type InfoSelect = InferSelectModel<typeof info>
export type InfoInsert = InferInsertModel<typeof info>

export type GenreSelect = InferSelectModel<typeof genre>
export type GenreInsert = InferInsertModel<typeof genre>

export type InfoToGenreSelect = InferSelectModel<typeof infoToGenre>
export type InfoToGenreInsert = InferInsertModel<typeof infoToGenre>

export type TagSelect = InferSelectModel<typeof tag>
export type TagInsert = InferInsertModel<typeof tag>

export type InfoToTagSelect = InferSelectModel<typeof infoToTag>
export type InfoToTagInsert = InferInsertModel<typeof infoToTag>

export type StudioSelect = InferSelectModel<typeof studio>
export type StudioInsert = InferInsertModel<typeof studio>

export type InfoToStudioSelect = InferSelectModel<typeof infoToStudio>
export type InfoToStudioInsert = InferInsertModel<typeof infoToStudio>

export type EpisodeSelect = InferSelectModel<typeof episode>
export type EpisodeInsert = InferInsertModel<typeof episode>
