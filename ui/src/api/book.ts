import Dexie from 'dexie'
import {
    allPagesFactory,
    apiFetch,
    encodeParams,
    PaginatedRequest,
    PaginatedResponse,
} from 'src/api/internal'
import { DB, DBBook } from 'src/database'
import { Book, List, PageType } from 'src/models'

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
    return await apiFetch('/api/books/reading?' + encodeParams(req))
}
export const reading = allPagesFactory<Book, PaginatedRequest>(readingPaged)

export async function readingUpdateCache(): Promise<Book[]> {
    const books = await reading({})

    await DB.series.each(async s => {
        const b = books.find(b => b.series === s.name)

        const seriesBooks = await DB.books
            .where(['series', 'completed', 'sort'])
            .between(
                [s.name, 0, Dexie.minKey],
                [s.name, 0, b?.sort ?? Dexie.maxKey],
            )
            .toArray()
        for (const b of seriesBooks) {
            await DB.saveBook(
                b,
                {
                    user_book: {
                        current_page: b.page_count,
                    },
                },
                false,
            )
        }
    })

    return books
}

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
