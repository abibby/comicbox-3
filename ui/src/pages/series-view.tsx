import { bind } from '@zwzn/spicy'
import Dexie from 'dexie'
import { FunctionalComponent, Fragment, h, Component } from 'preact'
import {
    BookOpen,
    Bookmark,
    ChevronDown,
    ChevronUp,
    Download,
    Edit,
    MoreHorizontal,
} from 'preact-feather'
import { useRoute } from 'preact-iso'
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { listNames } from 'src/api/series'
import { persist } from 'src/cache'
import classNames from 'src/classnames'
import { BookList } from 'src/components/book-list'
import { Button, ButtonGroup, SelectButton } from 'src/components/button'
import { openContextMenu } from 'src/components/context-menu'
import { Markdown, MarkdownProps } from 'src/components/markdown'
import { openModal } from 'src/components/modal-controller'
import { DB } from 'src/database'
import { useBookList } from 'src/hooks/book'
import { useImageURL } from 'src/hooks/image'
import { bookCompare, usePromptUpdate } from 'src/hooks/prompt-update'
import { useSeries } from 'src/hooks/series'
import { Book, Series } from 'src/models'
import { Error404 } from 'src/pages/errors'
import styles from 'src/pages/series-view.module.css'
import { route } from 'src/routes'
import {
    downloadSeries,
    updateSeriesMetadata,
} from 'src/services/series-service'
import { encode } from 'src/util'
import { isList } from 'src/pages/lists'
import { removeBookCache } from 'src/caches'
import { useHasScope } from 'src/api/auth'

const listOptions = [['', 'None'], ...listNames] as const

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

    const books = usePromptUpdate(liveBooks, bookCompare)

    const currentBooks = useMemo(() => {
        const current =
            books?.findIndex(
                b => b.id === series?.user_series?.latest_book_id,
            ) ?? 0
        return books?.slice(current, current + 7) ?? []
    }, [books, series?.user_series?.latest_book_id])
    const currentBook = currentBooks[0] ?? null

    const hasCurrentBooks = (currentBooks?.length ?? 0) > 0
    return (
        <>
            <SeriesHeader
                slug={slug}
                series={series}
                currentBook={currentBook}
                liveBooks={liveBooks}
            />
            {hasCurrentBooks && (
                <BookList
                    title='Bookmark'
                    books={currentBooks}
                    series={series ? [series] : null}
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

type SeriesHeaderProps = {
    slug: string
    series: Series | null
    currentBook: Book | null
    liveBooks: Book[]
}

function SeriesHeader({
    slug,
    series,
    currentBook,
    liveBooks,
}: SeriesHeaderProps) {
    const editSeries = useCallback(() => {
        void openModal(encode`/series/${slug}`)
    }, [slug])

    const [descriptionExpanded, setDescriptionExpanded] = useState(false)

    const markAllRead = useCallback(async () => {
        if (series?.slug !== undefined) {
            const seriesBooks = await DB.books
                .where(['series_slug', 'completed', 'sort'])
                .between(
                    [series?.slug, 0, Dexie.minKey],
                    [series?.slug, 0, Dexie.maxKey],
                )
                .toArray()
            for (const b of seriesBooks) {
                await DB.saveBook(b, {
                    user_book: {
                        current_page: b.page_count - 1,
                    },
                })
            }
            await DB.saveSeries(series, {
                user_series: {
                    latest_book_id: null,
                },
            })

            await persist(true)
        }
    }, [series])

    const markAllUnread = useCallback(async () => {
        if (series?.slug !== undefined) {
            const seriesBooks = await DB.books
                .where(['series_slug', 'sort'])
                .between(
                    [series?.slug, Dexie.minKey],
                    [series?.slug, Dexie.maxKey],
                )
                .toArray()
            for (const b of seriesBooks) {
                await DB.saveBook(b, {
                    user_book: {
                        current_page: 0,
                    },
                })
            }
            await DB.saveSeries(series, {
                user_series: {
                    latest_book_id: liveBooks[0]?.id ?? null,
                },
            })
            await persist(true)
        }
    }, [liveBooks, series])

    const removeAllDownloads = useCallback(async () => {
        if (series?.slug === undefined) {
            return
        }
        const seriesBooks = await DB.books
            .where(['series_slug', 'sort'])
            .between([series?.slug, Dexie.minKey], [series?.slug, Dexie.maxKey])
            .toArray()

        for (const book of seriesBooks) {
            await removeBookCache(book.id)
        }
    }, [series])

    const download = useCallback(async () => {
        if (series) {
            await downloadSeries(series)
        }
    }, [series])

    const updateMetadata = useCallback(async () => {
        await updateSeriesMetadata(slug)
    }, [slug])

    const bookmarkSeries = useCallback(
        async (list: string) => {
            if (!series) {
                return
            }

            if (!isList(list)) {
                return
            }

            await DB.saveSeries(series, {
                user_series: {
                    list: list,
                },
            })
            await persist(true)
        },
        [series],
    )
    const seriesWrite = useHasScope('series:write')

    const contextMenu = useCallback(
        async (e: MouseEvent) => {
            await openContextMenu(e, [
                { label: 'Mark All Read', action: markAllRead },
                { label: 'Mark All Unread', action: markAllUnread },
                {
                    label: 'Remove Downloaded Books',
                    action: removeAllDownloads,
                },
                {
                    label: 'Update Metadata',
                    action: updateMetadata,
                    active: seriesWrite,
                },
            ])
        },
        [
            markAllRead,
            markAllUnread,
            removeAllDownloads,
            seriesWrite,
            updateMetadata,
        ],
    )

    const coverURL = useImageURL(series?.cover_url)

    const descriptionRef = useRef<Component<MarkdownProps> | null>(null)
    const [showMoreButton, setShowMoreButton] = useState(false)
    useEffect(() => {
        if (!(descriptionRef.current?.base instanceof HTMLElement)) {
            return
        }
        const scroll = descriptionRef.current?.base?.scrollHeight ?? 0
        const client = descriptionRef.current?.base?.clientHeight ?? 0
        setShowMoreButton(scroll > client)
    }, [series?.description])

    return (
        <section class={styles.header}>
            <img class={styles.cover} src={coverURL} alt='Series Cover' />
            <h1 class={styles.title}>{series?.name}</h1>
            <a
                class={styles.year}
                href={route('series.index', {}) + encode`?year=${series?.year}`}
            >
                {series?.year}
            </a>
            <div class={styles.genres}>
                {series?.genres?.map((g, i) => (
                    <Fragment key={g}>
                        {i > 0 && ', '}
                        <a
                            class={styles.genre}
                            href={
                                route('series.index', {}) + encode`?genre=${g}`
                            }
                        >
                            {g}
                        </a>
                    </Fragment>
                ))}
            </div>
            <ButtonGroup class={styles.buttons}>
                <Button
                    color='primary'
                    icon={BookOpen}
                    href={route('book.view', {
                        id: currentBook?.id ?? liveBooks[0]?.id ?? '',
                    })}
                >
                    Read
                </Button>
                {seriesWrite && (
                    <Button color='clear' icon={Edit} onClick={editSeries} />
                )}
                <SelectButton
                    color='clear'
                    icon={Bookmark}
                    iconFilled={series?.user_series?.list === 'reading'}
                    options={listOptions}
                    onChange={bookmarkSeries}
                />
                <Button color='clear' icon={Download} onClick={download} />
                <Button
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
                        ref={descriptionRef}
                    >
                        {series?.description ?? ''}
                    </Markdown>
                    {showMoreButton &&
                        (descriptionExpanded ? (
                            <button
                                class={styles.btnDescriptionExpand}
                                onClick={bind(false, setDescriptionExpanded)}
                            >
                                Less <ChevronUp />
                            </button>
                        ) : (
                            <button
                                class={styles.btnDescriptionExpand}
                                onClick={bind(true, setDescriptionExpanded)}
                            >
                                More <ChevronDown />
                            </button>
                        ))}
                </div>
            )}
        </section>
    )
}

function reverse<T>(a: T[] | null): T[] | null {
    if (a === null) {
        return null
    }
    return Array.from(a).reverse()
}
