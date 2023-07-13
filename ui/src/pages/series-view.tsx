import Dexie from 'dexie'
import { FunctionalComponent, h } from 'preact'
import { useCallback, useEffect, useState } from 'preact/hooks'
import { book, series } from 'src/api'
import { persist, useCached } from 'src/cache'
import { BookList } from 'src/components/book-list'
import { Button, ButtonGroup } from 'src/components/button'
import { openModal } from 'src/components/modal'
import { EditSeries } from 'src/components/series-edit'
import { DB } from 'src/database'
import { post } from 'src/message'
import { Book, Series } from 'src/models'
import { Error404 } from 'src/pages/404'

interface SeriesViewProps {
    matches?: {
        series: string
    }
}

export const SeriesView: FunctionalComponent<SeriesViewProps> = props => {
    const name = props.matches?.series ?? ''
    const listName = `series:${name}`
    const seriesList = useCached(
        listName,
        { name: name },
        DB.series,
        series.list,
    )

    if (seriesList === null) {
        return <SeriesList name={name} />
    }

    const s = seriesList[0]
    if (s === undefined) {
        return <Error404 />
    }

    return <SeriesList name={name} series={s} />
}

interface SeriesListProps {
    name: string
    series?: Series
}

const SeriesList: FunctionalComponent<SeriesListProps> = ({ name, series }) => {
    const listName = `series:${name}`

    const books = useCached(listName, { series: name }, DB.books, book.list)
    const [currentBooks, setCurrentBooks] = useState<Book[]>([])
    useEffect(() => {
        if (books === null) return
        const count = 7
        const current = books.findIndex(b => b.completed === 0)
        let start = current - Math.floor(count / 2)
        let end = current + Math.ceil(count / 2)
        if (start < 0) {
            start = 0
            end = count
        }
        if (end > books.length || current === -1) {
            start = books.length - count
            end = books.length
        }

        setCurrentBooks(books.slice(start, end))
    }, [books])

    const editSeries = useCallback(() => {
        if (series === undefined) {
            return
        }
        openModal(EditSeries, {
            series: series,
        })
    }, [series])
    const seriesName = series?.name
    const markAllRead = useCallback(async () => {
        if (seriesName !== undefined) {
            const seriesBooks = await DB.books
                .where(['series', 'completed', 'sort'])
                .between(
                    [seriesName, 0, Dexie.minKey],
                    [seriesName, 0, Dexie.maxKey],
                )
                .toArray()
            for (const b of seriesBooks) {
                await DB.saveBook(b, {
                    user_book: {
                        current_page: b.page_count - 1,
                    },
                })
            }
            await persist(true)
        }
    }, [seriesName])
    const markAllUnread = useCallback(async () => {
        if (seriesName !== undefined) {
            const seriesBooks = await DB.books
                .where(['series', 'sort'])
                .between([seriesName, Dexie.minKey], [seriesName, Dexie.maxKey])
                .toArray()
            for (const b of seriesBooks) {
                await DB.saveBook(b, {
                    user_book: {
                        current_page: 0,
                    },
                })
            }
            await persist(true)
        }
    }, [seriesName])

    const downloadSeries = useCallback(() => {
        post({
            type: 'download-series',
            seriesName: name,
        })
    }, [name])

    return (
        <div>
            <h1>{name}</h1>
            <section>
                List: {series?.user_series?.list ?? 'none'}
                <ButtonGroup>
                    <Button onClick={downloadSeries}>Download</Button>
                    <Button onClick={editSeries}>Edit</Button>
                    <Button onClick={markAllRead}>Mark All Read</Button>
                    <Button onClick={markAllUnread}>Mark All Unread</Button>
                </ButtonGroup>
            </section>
            <BookList books={currentBooks} />
            <h2>All Books</h2>
            <BookList books={books} />
        </div>
    )
}
