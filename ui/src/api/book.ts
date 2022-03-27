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

    // TODO: make it so you don't need to fetch all of the books from series
    // you are reading
    // await Promise.all(
    //     books.data.map(async readingBooks => {
    //         const seriesBooks = await DB.books
    //             .where(['series', 'completed', 'sort'])
    //             .between(
    //                 [readingBooks.series, 0, Dexie.minKey],
    //                 [readingBooks.series, 0, readingBooks.sort],
    //             )
    //             .toArray()
    //         for (const b of seriesBooks) {
    //             DB.saveBook(b, {
    //                 user_book: {
    //                     current_page: b.page_count,
    //                 },
    //             })
    //         }
    //     }),
    // )

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
