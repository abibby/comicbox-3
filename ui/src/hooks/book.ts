import { bookAPI } from 'src/api'
import { AllPagesRequest } from 'src/api/internal'
import { CacheOptions, useCached } from 'src/cache'
import { bookCache } from 'src/cache/book'
import { DB, DBBook } from 'src/database'
import { Book } from 'src/models'

export function useBookList(
    listName: string,
    req: AllPagesRequest<bookAPI.BookListRequest>,
    options: Partial<
        CacheOptions<DBBook, AllPagesRequest<bookAPI.BookListRequest>>
    > = {},
): [DBBook[], boolean] {
    const bookList = useCached({
        listName: listName,
        request: req,
        table: DB.books,
        network: bookAPI.list,
        cache: bookCache,
        ...options,
    })

    return [bookList ?? [], bookList === null]
}

export function useBook(id: string | null): [DBBook | null, boolean] {
    const [bookList, loading] = useBookList(
        id ?? '',
        {
            id: id ?? '',
            limit: 1,
        },
        {
            wait: !id,
        },
    )
    return [bookList[0] ?? null, loading]
}

export function usePreviousBook(b: Book | undefined | null): Book | undefined {
    const id = b?.id ?? 'no-id'
    const seriesSlug = b?.series_slug ?? 'no-series'
    const previousResponse = useCached({
        listName: `book:${id}:previous`,
        request: {
            series_slug: seriesSlug,
            before_id: id,
            limit: 1,
            order: 'desc',
        },
        table: DB.books,
        network: bookAPI.list,
        cache: bookCache,
        wait: !b,
    })
    const previous = previousResponse?.[0]
    return previous
}

export function useNextBook(b: Book | undefined | null): Book | undefined {
    const id = b?.id ?? 'no-id'
    const seriesSlug = b?.series_slug ?? 'no-series'
    const nextResponse = useCached({
        listName: `book:${id}:next`,
        request: { series_slug: seriesSlug, after_id: id, limit: 1 },
        table: DB.books,
        network: bookAPI.list,
        cache: bookCache,
        wait: !b,
    })
    const next = nextResponse?.[0]
    return next
}
