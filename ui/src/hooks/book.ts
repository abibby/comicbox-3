import { book } from 'src/api'
import { useCached } from 'src/cache'
import { DB } from 'src/database'
import { Book } from 'src/models'

export function usePreviousBook(b: Book): Book | undefined {
    const previousResponse = useCached(
        `book:${b.id}:previous`,
        { series: b.series, before_id: b.id, limit: 1, order: 'desc' },
        DB.books,
        book.list,
    )
    const previous = previousResponse?.[0]
    return previous
}

export function useNextBook(b: Book): Book | undefined {
    const nextResponse = useCached(
        `book:${b.id}:next`,
        { series: b.series, after_id: b.id, limit: 1 },
        DB.books,
        book.list,
    )
    const next = nextResponse?.[0]
    return next
}
