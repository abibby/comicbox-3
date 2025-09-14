import {
    allPagesFactory,
    apiFetch,
    encodeParams,
    PaginatedRequest,
    PaginatedResponse,
} from 'src/api/internal'
import { DBBook } from 'src/database'
import { Book, BookUpdateRequest, List } from 'src/models'

export type BookListRequest = PaginatedRequest & {
    id?: string
    series_slug?: string
    unread?: boolean
    list?: List
    before_id?: string
    after_id?: string
    order_by?: 'default' | 'created_at'
    order?: 'asc' | 'desc'
    with_series?: boolean
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

export async function update(
    id: string,
    req: BookUpdateRequest,
): Promise<Book> {
    return await apiFetch(`/api/books/${encodeURIComponent(id)}`, {
        method: 'POST',
        body: JSON.stringify(req),
    })
}
