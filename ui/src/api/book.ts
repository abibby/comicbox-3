import {
    allPagesFactory,
    apiFetch,
    encodeParams,
    PaginatedRequest,
    PaginatedResponse,
} from 'src/api/internal'
import { DBBook } from 'src/database'
import { Book, List, PageType } from 'src/models'

export type BookListRequest = PaginatedRequest & {
    id?: string
    series_slug?: string
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

export interface BookDeleteRequest {
    file: boolean
}

export async function remove(
    id: string,
    req: BookDeleteRequest = { file: false },
): Promise<Book> {
    return await apiFetch(`/api/books/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        body: JSON.stringify(req),
    })
}

export interface BookUpdateRequest {
    title: string
    series_slug: string
    volume: number | null
    chapter: number | null
    rtl: boolean
    long_strip: boolean | null
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
