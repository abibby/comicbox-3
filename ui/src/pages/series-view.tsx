import Dexie from 'dexie'
import { FunctionalComponent, Fragment, h } from 'preact'
import {
    Bookmark,
    ChevronDown,
    ChevronUp,
    Download,
    Edit,
    MoreHorizontal,
    Play,
} from 'preact-feather'
import { useRoute } from 'preact-iso'
import { useCallback, useEffect, useState } from 'preact/hooks'
import { persist } from 'src/cache'
import classNames from 'src/classnames'
import { BookList } from 'src/components/book-list'
import { ButtonGroup, IconButton } from 'src/components/button'
import { openContextMenu } from 'src/components/context-menu'
import { Markdown } from 'src/components/markdown'
import { openModal } from 'src/components/modal-controller'
import { DB } from 'src/database'
import { useBookList } from 'src/hooks/book'
import { useImageURL } from 'src/hooks/image'
import { bookCompare, usePromptUpdate } from 'src/hooks/prompt-update'
import { useSeries } from 'src/hooks/series'
import { post } from 'src/message'
import { Book, List, Series } from 'src/models'
import { Error404 } from 'src/pages/errors'
import styles from 'src/pages/series-view.module.css'
import { route } from 'src/routes'
import { updateSeriesMetadata } from 'src/services/series-service'
import { encode } from 'src/util'

export const SeriesView: FunctionalComponent = () => {
    const { params } = useRoute()
    const slug = params.series ?? ''
    const [series, loading] = useSeries(slug)

    if (!loading && series === undefined) {
        return <Error404 />
    }

    return <SeriesList slug={slug} series={series} />
}

interface SeriesListProps {
    slug: string
    series: Series | null
}

const SeriesList: FunctionalComponent<SeriesListProps> = ({ slug, series }) => {
    const listName = `series:${slug}`

    const [liveBooks] = useBookList(listName, {
        series_slug: slug,
        limit: null,
    })
    const [liveCurrentBooks, setLiveCurrentBooks] = useState<Book[] | null>(
        null,
    )
    const [currentBook, setCurrentBook] = useState<Book | null>(null)

    const books = usePromptUpdate(liveBooks, bookCompare)
    const currentBooks = usePromptUpdate(liveCurrentBooks, bookCompare)

    const [descriptionExpanded, setDescriptionExpanded] = useState(false)

    const showDescription = useCallback(() => setDescriptionExpanded(true), [])
    const hideDescription = useCallback(() => setDescriptionExpanded(false), [])

    useEffect(() => {
        if (liveBooks === null) return
        const count = 7
        if (liveBooks.length <= count) {
            setLiveCurrentBooks([])
            return
        }
        const current = liveBooks.findIndex(b => b.completed === 0)
        setCurrentBook(liveBooks[current] ?? null)
        let start = current - Math.floor(count / 2)
        let end = current + Math.ceil(count / 2)
        if (start < 0) {
            start = 0
            end = count
        }
        if (end > liveBooks.length || current === -1) {
            start = liveBooks.length - count
            end = liveBooks.length
        }

        setLiveCurrentBooks(liveBooks.slice(start, end))
    }, [liveBooks])

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
                .where(['series_slug', 'sort'])
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

    const updateMetadata = useCallback(async () => {
        await updateSeriesMetadata(slug)
    }, [slug])

    const bookmarkSeries = useCallback(async () => {
        if (!series) {
            return
        }

        let list = List.Reading
        if (series.user_series?.list === List.Reading) {
            list = List.Paused
        }

        await DB.saveSeries(series, {
            user_series: {
                list: list,
            },
        })
        await persist(true)
    }, [series])

    const contextMenu = useCallback(
        async (e: MouseEvent) => {
            await openContextMenu(e, [
                ['Mark All Read', markAllRead],
                ['Mark All Unread', markAllUnread],
                ['Update Metadata', updateMetadata],
            ])
        },
        [markAllRead, markAllUnread, updateMetadata],
    )

    const hasCurrentBooks = (currentBooks?.length ?? 0) > 0
    const coverURL = useImageURL(series?.cover_url)
    return (
        <>
            <section class={styles.header}>
                <img class={styles.cover} src={coverURL} alt='Series Cover' />
                <h1 class={styles.title}>{series?.name}</h1>
                <p class={styles.year}>{series?.year}</p>
                <div class={styles.genres}>
                    {series?.genres.map((g, i) => (
                        <Fragment key={g}>
                            {i > 0 && ', '}
                            <a
                                class={styles.genre}
                                href={
                                    route('series.index', {}) +
                                    encode`?genre=${g}`
                                }
                            >
                                {g}
                            </a>
                        </Fragment>
                    ))}
                </div>
                <ButtonGroup class={styles.buttons}>
                    <IconButton
                        color='primary'
                        icon={Play}
                        href={route('book.view', {
                            id: currentBook?.id ?? liveBooks[0]?.id ?? '',
                        })}
                    >
                        {currentBook?.id ? 'Next Chapter' : 'Read'}
                    </IconButton>
                    <IconButton
                        color='clear'
                        icon={Edit}
                        onClick={editSeries}
                    />
                    <IconButton
                        color='clear'
                        icon={Bookmark}
                        filled={series?.user_series?.list === 'reading'}
                        onClick={bookmarkSeries}
                    />
                    <IconButton
                        color='clear'
                        icon={Download}
                        onClick={downloadSeries}
                    />
                    <IconButton
                        color='clear'
                        icon={MoreHorizontal}
                        onClick={contextMenu}
                    />
                </ButtonGroup>
                {series?.description && (
                    <div class={styles.description}>
                        <Markdown
                            class={classNames(styles.descriptionContent, {
                                [styles.open]: descriptionExpanded,
                            })}
                        >
                            {series?.description ?? ''}
                        </Markdown>
                        {descriptionExpanded || (
                            <button
                                class={styles.btnDescriptionExpand}
                                onClick={showDescription}
                            >
                                More <ChevronDown />
                            </button>
                        )}
                        {descriptionExpanded && (
                            <button
                                class={styles.btnDescriptionExpand}
                                onClick={hideDescription}
                            >
                                Less <ChevronUp />
                            </button>
                        )}
                    </div>
                )}
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
