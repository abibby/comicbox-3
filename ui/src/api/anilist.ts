import { apiFetch } from 'src/api/internal'
import slog from 'src/slog'

export interface GraphQLResponseError {
    message: string
    locations?: GraphQLResponseErrorLocation[]
    // [propName: string]: any // 7.2.2 says 'GraphQL servers may provide additional entries to error'
}
export interface GraphQLResponseErrorLocation {
    line: number
    column: number
}
export interface GraphQlResponse {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any
    errors?: GraphQLResponseError[]
}

async function gql(
    query: string,
    variables: Record<string, unknown>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<Record<string, any>> {
    // Define the config we'll need for our Api request
    const url = 'https://graphql.anilist.co',
        options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                query: query,
                variables: variables,
            }),
        }

    // Make the HTTP Api request
    const response = await fetch(url, options)
    const json: GraphQlResponse = await response.json()
    if (!response.ok) {
        slog.Warn('anilist api failed', { query: query })
        throw new Error('anilist api failed')
    }
    return json.data
}

interface PaginatedResponse<T> {
    pageInfo: {
        total: number
    }
    results: T[]
}

export enum MediaFormat {
    // Anime broadcast on television
    tv = 'TV',

    // Anime which are under 15 minutes in length and broadcast on television
    tvShort = 'TV_SHORT',

    // Anime movies with a theatrical release
    movie = 'MOVIE',

    // Special episodes that have been included in DVD/Blu-ray releases, picture dramas, pilots, etc
    special = 'SPECIAL',

    // (Original Video Animation) Anime that have been released directly on DVD/Blu-ray without originally going through a theatrical release or television broadcast
    ova = 'OVA',

    // (Original Net Animation) Anime that have been originally released online or are only available through streaming services.
    ona = 'ONA',

    // Short anime released as a music video
    music = 'MUSIC',

    // Professionally published manga with more than one chapter
    manga = 'MANGA',

    // Written books released as a series of light novels
    novel = 'NOVEL',

    // Manga with just one chapter
    oneShot = 'ONE_SHOT',
}

export interface SearchMangaResponse {
    id: number
    title: {
        userPreferred: string
        romaji: string
        native: string
        english: string
    }
    coverImage: {
        large: string
    }
    type: string
    format: MediaFormat
}

export async function searchManga(
    search: string,
): Promise<PaginatedResponse<SearchMangaResponse>> {
    const query = `
      query ($search: String, $isAdult: Boolean) {
        manga: Page(perPage: 8) {
          pageInfo {
            total
          }
          results: media(type: MANGA, isAdult: $isAdult, search: $search) {
            id
            title {
              userPreferred
              romaji
              native
              english
            }
            coverImage {
              large
            }
            type
            format
          }
        }
      }
    `

    const variables = {
        search: search,
    }
    const response = await gql(query, variables)
    return response.manga
}

export interface UpdateMangaRequest {
    mediaId: number
    progress: number | null
    progressVolumes: number | null
    startedAt?: string | null
}
export async function updateManga(r: UpdateMangaRequest): Promise<unknown> {
    return await apiFetch('/api/anilist/update', {
        method: 'POST',
        body: JSON.stringify(r),
    })
}

interface LoginRequest {
    grant: string
}

export async function login(req: LoginRequest): Promise<unknown> {
    return await apiFetch('/api/anilist/login', {
        method: 'POST',
        body: JSON.stringify(req),
    })
}
