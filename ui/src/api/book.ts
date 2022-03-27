import { DBBook } from '../database'
import { Book, List, PageType } from '../models'
import {
    allPagesFactory,
    apiFetch,
    encodeParams,
    PaginatedRequest,
    PaginatedResponse,
} from './internal'

export type BookListRequest = PaginatedRequest & {
    id?: string
    series?: string
    list?: List
    before_id?: string
    after_id?: string
    order_by?: 'default' | 'created_at'
    order?: 'asc' | 'desc'
}

export async function listPaged(
    req: BookListRequest = {},
): Promise<PaginatedResponse<DBBook>> {
    return await apiFetch('/api/books?' + encodeParams(req))
}

export const list = allPagesFactory<DBBook, BookListRequest>(listPaged)

export async function readingPaged(
    req: PaginatedRequest = {},
): Promise<PaginatedResponse<Book>> {
    const books: PaginatedResponse<Book> = await apiFetch(
        '/api/books/reading?' + encodeParams(req),
    )

    const series = books.data.map(b => b.series)

    return books
}
export const reading = allPagesFactory<Book, PaginatedRequest>(readingPaged)

export interface BookUpdateRequest {
    title: string
    series: string
    volume: number | null
    chapter: number | null
    rtl: boolean
    pages: BookPageUpdate[]
    update_map: Record<string, string>
}

export interface BookPageUpdate {
    type: PageType
}

export async function update(
    id: string,
    req: BookUpdateRequest,
): Promise<Book> {
    return await apiFetch(`/api/books/${encodeURIComponent(id)}`, {
        method: 'POST',
        body: JSON.stringify(req),
    })
}
