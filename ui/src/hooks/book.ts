import { bookAPI } from 'src/api'
import { useCached } from 'src/cache'
import { DB } from 'src/database'
import { Book } from 'src/models'

export function useBook(id: string): [Book | null, boolean] {
    const bookList = useCached({
        listName: `book:${id}`,
        request: { id: id },
        table: DB.books,
        network: bookAPI.list,
    })

    return [bookList?.[0] ?? null, bookList === null]
}

export function usePreviousBook(b: Book | undefined | null): Book | undefined {
    const id = b?.id ?? 'no-id'
    const series = b?.series ?? 'no-series'
    const previousResponse = useCached({
        listName: `book:${id}:previous`,
        request: { series: series, before_id: id, limit: 1, order: 'desc' },
        table: DB.books,
        network: bookAPI.list,
        wait: !b,
    })
    const previous = previousResponse?.[0]
    return previous
}

export function useNextBook(b: Book | undefined | null): Book | undefined {
    const id = b?.id ?? 'no-id'
    const series = b?.series ?? 'no-series'
    const nextResponse = useCached({
        listName: `book:${id}:next`,
        request: { series: series, after_id: id, limit: 1 },
        table: DB.books,
        network: bookAPI.list,
        wait: !b,
    })
    const next = nextResponse?.[0]
    return next
}
