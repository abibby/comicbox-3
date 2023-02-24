import { beforeEach, describe, expect, test } from '@jest/globals'
import { clearDatabase, DB, DBBook } from 'src/database'

const emptyBook: Readonly<DBBook> = {
    created_at: '1970-01-01T00:00:00Z',
    updated_at: '1970-01-01T00:00:00Z',
    deleted_at: null,
    update_map: {},
    id: '',
    title: '',
    chapter: null,
    volume: null,
    series: '',
    authors: [],
    pages: [],
    page_count: 0,
    rtl: false,
    sort: '',
    file: '',
    cover_url: '',
    user_book: {
        created_at: '1970-01-01T00:00:00Z',
        updated_at: '1970-01-01T00:00:00Z',
        deleted_at: null,
        update_map: {},
        current_page: 0,
    },
    completed: 0,
}

describe('database', () => {
    beforeEach(() => {
        clearDatabase()
    })
    test('add book from network has dirty 0', async () => {
        await DB.fromNetwork(DB.books, [{ ...emptyBook, title: 'test' }])

        const b = await DB.books.toArray()
        expect(b).toHaveLength(1)
        expect(b[0]?.dirty).toEqual(0)
    })
    test("don't update if no update map from server", async () => {
        await DB.fromNetwork(DB.books, [
            { ...emptyBook, id: '1', title: 'test' },
        ])

        const book = await DB.books.get('1')
        await DB.saveBook(book!, { title: 'test2' })

        await DB.fromNetwork(DB.books, [
            { ...emptyBook, id: '1', title: 'test3' },
        ])

        const b = await DB.books.toArray()
        expect(b[0]?.dirty).toEqual(1)
        expect(b[0]?.update_map.title).not.toBe(undefined)
        expect(b[0]?.title).toBe('test2')
    })
    test("don't update if local update map is newer", async () => {
        const time = Date.now()
        await DB.fromNetwork(DB.books, [
            { ...emptyBook, id: '1', title: 'test' },
        ])

        const book = await DB.books.get('1')
        await DB.saveBook(book!, { title: 'test2' })

        await DB.fromNetwork(DB.books, [
            {
                ...emptyBook,
                id: '1',
                title: 'test3',
                update_map: { title: `${time - 1}-00000000-1` },
            },
        ])

        const b = await DB.books.toArray()
        expect(b[0]?.dirty).toEqual(1)
        expect(b[0]?.update_map.title).not.toBe(undefined)
        expect(b[0]?.title).toBe('test2')
    })

    test('update if remote update map is newer', async () => {
        const time = Date.now()
        await DB.fromNetwork(DB.books, [
            { ...emptyBook, id: '1', title: 'test' },
        ])

        const book = await DB.books.get('1')
        await DB.saveBook(book!, { title: 'test2' })

        await DB.fromNetwork(DB.books, [
            {
                ...emptyBook,
                id: '1',
                title: 'test3',
                update_map: { title: `${time + 1000}-00000000-1` },
            },
        ])

        const b = await DB.books.toArray()
        expect(b[0]?.dirty).toEqual(0)
        expect(typeof b[0]?.update_map.title).toBe('string')
        expect(b[0]?.title).toBe('test3')
    })
})
