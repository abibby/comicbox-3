import { apiFetch } from './internal'

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
    data?: any
    errors?: GraphQLResponseError[]
}

async function gql(
    query: string,
    variables: Record<string, unknown>,
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
        console.error(json)
        throw new Error('bad')
    }
    return json.data
}

interface PaginatedResponse<T> {
    pageInfo: {
        total: number
    }
    results: T[]
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
    format: string
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

export async function updateManga(): Promise<unknown> {
    return await apiFetch('/api/anilist/update', {
        method: 'POST',
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
