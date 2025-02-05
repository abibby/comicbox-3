import Dexie from 'dexie'
import { FunctionalComponent, Fragment, h } from 'preact'
import { Edit, MoreHorizontal } from 'preact-feather'
import { useRoute } from 'preact-iso'
import { useCallback, useEffect, useState } from 'preact/hooks'
import { persist } from 'src/cache'
import { BookList } from 'src/components/book-list'
import { ButtonGroup, IconButton } from 'src/components/button'
import { openContextMenu } from 'src/components/context-menu'
import { openModal } from 'src/components/modal-controller'
import { DB } from 'src/database'
import { useBookList } from 'src/hooks/book'
import { useSeries } from 'src/hooks/series'
import { post } from 'src/message'
import { Book, Series } from 'src/models'
import { Error404 } from 'src/pages/errors'
import styles from 'src/pages/series-view.module.css'
import { encode } from 'src/util'

export const SeriesView: FunctionalComponent = () => {
    const { params } = useRoute()
    const slug = params.series ?? ''
    const [s, loading] = useSeries(slug)

    if (!loading && s === undefined) {
        return <Error404 />
    }

    return <SeriesList slug={slug} series={s} />
}

interface SeriesListProps {
    slug: string
    series: Series | null
}

const SeriesList: FunctionalComponent<SeriesListProps> = ({ slug, series }) => {
    const listName = `series:${slug}`

    const [books] = useBookList(listName, { series_slug: slug, limit: null })
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
        void openModal(encode`/series/${slug}`)
    }, [slug])
    const seriesName = series?.name
    const markAllRead = useCallback(async () => {
        if (seriesName !== undefined) {
            const seriesBooks = await DB.books
                .where(['series_slug', 'completed', 'sort'])
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
            seriesSlug: slug,
        })
    }, [slug])

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
                <h1>{seriesName}</h1>
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
                    series={series ? [series] : null}
                    scrollTo={currentBook}
                />
            )}
            <BookList
                title={hasCurrentBooks ? 'All Books' : undefined}
                scroll='vertical'
                books={reverse(books)}
                series={series ? [series] : null}
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
