import Dexie from 'dexie'
import { FunctionalComponent, Fragment, h } from 'preact'
import { Edit, MoreHorizontal } from 'preact-feather'
import { useRoute } from 'preact-iso'
import { useCallback, useEffect, useState } from 'preact/hooks'
import { bookAPI, seriesAPI } from 'src/api'
import { persist, useCached } from 'src/cache'
import { BookList } from 'src/components/book-list'
import { ButtonGroup, IconButton } from 'src/components/button'
import { openContextMenu } from 'src/components/context-menu'
import { openModal } from 'src/components/modal-controller'
import { DB } from 'src/database'
import { post } from 'src/message'
import { Book, Series } from 'src/models'
import { Error404 } from 'src/pages/errors'
import styles from 'src/pages/series-view.module.css'
import { encode } from 'src/util'

export const SeriesView: FunctionalComponent = () => {
    const { params } = useRoute()
    const name = params.series ?? ''
    const seriesList = useCached({
        listName: `series:${name}`,
        request: { name: name },
        table: DB.series,
        network: seriesAPI.list,
    })

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

    const books = useCached({
        listName,
        request: { series: name },
        table: DB.books,
        network: bookAPI.list,
    })
    const [currentBooks, setCurrentBooks] = useState<Book[] | null>(null)
    const [currentBook, setCurrentBook] = useState<Book | null>(null)
    useEffect(() => {
        if (books === null) return
        const count = 7
        if (books.length <= count) {
            setCurrentBooks([])
            return
        }
        const current = books.findIndex(b => b.completed === 0)
        setCurrentBook(books[current] ?? null)
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
        void openModal(encode`/series/${series.name}`)
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

    const downloadSeries = useCallback(async () => {
        await post({
            type: 'download-series',
            seriesName: name,
        })
    }, [name])

    const contextMenu = useCallback(
        async (e: MouseEvent) => {
            await openContextMenu(e, [
                ['Download', downloadSeries],
                ['Mark All Read', markAllRead],
                ['Mark All Unread', markAllUnread],
            ])
        },
        [downloadSeries, markAllRead, markAllUnread],
    )

    const hasCurrentBooks = (currentBooks?.length ?? 0) > 0

    return (
        <>
            <section class={styles.header}>
                <h2>{name}</h2>
                <ButtonGroup class={styles.actions}>
                    <IconButton
                        color='clear'
                        icon={Edit}
                        onClick={editSeries}
                    />
                    <IconButton
                        color='clear'
                        icon={MoreHorizontal}
                        onClick={contextMenu}
                    />
                </ButtonGroup>
            </section>
            {hasCurrentBooks && (
                <BookList
                    title='Bookmark'
                    books={currentBooks}
                    scrollTo={currentBook}
                />
            )}
            <BookList
                title={hasCurrentBooks ? 'All Books' : undefined}
                scroll='vertical'
                books={reverse(books)}
            />
        </>
    )
}

function reverse<T>(a: T[] | null): T[] | null {
    if (a === null) {
        return null
    }
    return Array.from(a).reverse()
}
