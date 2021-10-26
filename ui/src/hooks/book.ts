import { book } from '../api'
import { useCached } from '../cache'
import { DB } from '../database'
import { Book } from '../models'

export function usePreviousBook(id: string, b: Book): Book | undefined {
    const previousResponse = useCached(
        id,
        { series: b.series, before_id: b.id, limit: 1, order: 'desc' },
        DB.books,
        book.list,
    )
    const previous = previousResponse?.[0]
    return previous
}

export function useNextBook(id: string, b: Book): Book | undefined {
    const nextResponse = useCached(
        id,
        { series: b.series, after_id: b.id, limit: 1 },
        DB.books,
        book.list,
    )
    const next = nextResponse?.[0]
    return next
}
