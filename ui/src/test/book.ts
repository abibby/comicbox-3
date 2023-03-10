import { DBBook } from 'src/database'
import { PartialDeep } from 'src/test/mode'

let bookID = 1
export function newTestBook(b: PartialDeep<DBBook>): DBBook {
    return {
        created_at: '1970-01-01T00:00:00Z',
        updated_at: '1970-01-01T00:00:00Z',
        deleted_at: null,
        update_map: {},
        id: String(bookID++),
        title: '',
        chapter: null,
        volume: null,
        series: '',
        authors: [],
        pages: [],
        page_count: 0,
        rtl: false,
        sort: [
            b.series,
            (b.volume ?? 0).toString().padStart(10, '0'),
            (b.chapter ?? 0).toString().padStart(10, '0'),
            b.title,
            b.id,
        ].join('|'),
        file: '',
        cover_url: '',
        completed: 0,
        ...b,
        user_book: {
            created_at: '1970-01-01T00:00:00Z',
            updated_at: '1970-01-01T00:00:00Z',
            deleted_at: null,
            update_map: {},
            current_page: 0,
            ...b.user_book,
        },
    }
}
