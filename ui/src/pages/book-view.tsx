import noCover from 'res/images/no-cover.svg'
import { FunctionalComponent, h, JSX } from 'preact'
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import { persist } from 'src/cache'
import classNames from 'src/classnames'
import { Overlay } from 'src/components/reading-overlay'
import { DB } from 'src/database'
import { useBook, useNextBook, usePreviousBook } from 'src/hooks/book'
import { useWindowEvent } from 'src/hooks/event-listener'
import { usePageURL } from 'src/hooks/page'
import { useMediaQuery } from 'src/hooks/use-media-query'
import { Book, Page, PageType, Series } from 'src/models'
import { Error404 } from 'src/pages/errors'
import styles from 'src/pages/book-view.module.css'
import { route } from 'src/routes'
import {
    MergedPages,
    translate,
    useMergedPages,
} from 'src/services/book-service'
import { useLocation, useRoute } from 'preact-iso'
import { useSeries } from 'src/hooks/series'

export const BookView: FunctionalComponent = () => {
    const { params } = useRoute()
    const id = params.id

    const [book, bookLoading] = useBook(id ?? null)
    const [series, seriesLoading] = useSeries(book?.series_slug ?? null)

    if (bookLoading || seriesLoading) {
        return <div>loading</div>
    }
    if (!book || !series) {
        return <Error404 />
    }

    let sourcePage = 0

    if (params.page) {
        sourcePage = Number(params.page)
    } else if (book.user_book?.current_page) {
        sourcePage = book.user_book.current_page
    }

    return <Reader book={book} series={series} sourcePage={sourcePage} />
}

interface ReaderProps {
    book: Book
    series: Series
    sourcePage: number
}

const Reader: FunctionalComponent<ReaderProps> = props => {
    const { route: navigate } = useLocation()
    const book = props.book
    const activePage = translate(book, props.sourcePage)
        .from('sourcePage')
        .to('activePage')
    const rtl = book.rtl

    const landscape = useMediaQuery('(orientation: landscape)')
    const pages = useMergedPages(book.pages, book.long_strip, landscape)
    const mergedPage = translate(book, props.sourcePage)
        .from('sourcePage')
        .toMerged(pages)

    const nextBook = useNextBook(book)
    const previousBook = usePreviousBook(book)

    const bookID = book.id
    const previousBookID = previousBook?.id

    const setSourcePage = useCallback(
        async (newPage: number) => {
            navigate(route('book.view', { id: bookID, page: newPage }), true)

            const b = await DB.books.where('id').equals(bookID).first()
            if (b === undefined) {
                return
            }
            await DB.saveBook(b, {
                user_book: {
                    current_page: newPage,
                },
            })
            const s = await DB.series
                .where('slug')
                .equals(b.series_slug)
                .first()
            if (s !== undefined) {
                await DB.saveSeries(s, {
                    user_series: {
                        latest_book_id: bookID,
                        last_read_at: new Date().toISOString(),
                    },
                })
            }
            await persist(true)
        },
        [bookID, navigate],
    )

    const setMergedPage = useCallback(
        async (newMergedPage: number) => {
            if (newMergedPage === mergedPage) {
                return
            }
            if (Number(newMergedPage) >= pages.length) {
                if (nextBook?.id) {
                    navigate(
                        route('book.view', {
                            id: nextBook.id,
                            page: translate(nextBook, 0)
                                .from('activePage')
                                .to('sourcePage'),
                        }),
                    )
                } else {
                    navigate(route('home', {}))
                }
                await DB.saveSeries(props.series, {
                    user_series: {
                        latest_book_id: nextBook?.id,
                    },
                })
                await persist(true)
                return
            }
            if (Number(newMergedPage) < 0) {
                if (previousBookID) {
                    navigate(route('book.view', { id: previousBookID }))
                } else {
                    navigate(route('home', {}))
                }
                return
            }

            const newPage = translate(book, newMergedPage)
                .fromMerged(pages)
                .to('sourcePage')

            await setSourcePage(newPage)
        },
        [
            mergedPage,
            pages,
            book,
            setSourcePage,
            nextBook,
            props.series,
            navigate,
            previousBookID,
        ],
    )
    let leftOffset = -1
    let rightOffset = +1

    if (rtl) {
        leftOffset = +1
        rightOffset = -1
    }
    const [menuOpen, setMenuOpen] = useState(false)
    const overlay = useRef<HTMLDivElement>(null)

    const setPageLeft = useCallback(async () => {
        await setMergedPage(mergedPage + leftOffset)
    }, [leftOffset, mergedPage, setMergedPage])
    const setPageRight = useCallback(async () => {
        await setMergedPage(mergedPage + rightOffset)
    }, [mergedPage, rightOffset, setMergedPage])

    const click = useCallback(
        async (event: JSX.TargetedMouseEvent<HTMLDivElement>) => {
            if (menuOpen) {
                if (event.target === overlay.current) {
                    setMenuOpen(false)
                }
                return
            }

            const section = ['left', 'center', 'right'][
                Math.floor((event.pageX / window.innerWidth) * 3)
            ]

            switch (section) {
                case 'left':
                    await setPageLeft()
                    break
                case 'right':
                    await setPageRight()
                    break
                case 'center':
                    setMenuOpen(true)
                    return
            }
        },
        [menuOpen, setPageLeft, setPageRight],
    )

    useWindowEvent(
        'keydown',
        async e => {
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault()
                    await setPageLeft()
                    break
                case 'ArrowRight':
                    e.preventDefault()
                    await setPageRight()
                    break
                case 'Escape':
                    e.preventDefault()
                    setMenuOpen(open => !open)
                    break
            }
        },
        [setPageLeft, setPageRight],
    )

    return (
        <div
            class={classNames(styles.reader, {
                [styles.rtl]: book.rtl,
            })}
            onClick={click}
        >
            <div class={styles.direction}>
                <svg viewBox='0 0 30 15'>
                    <path d='M0,4 H22.5 V0 L30,7.5 L22.5,15 V11 H0 z' />
                </svg>
            </div>
            <Overlay
                book={book}
                series={props.series}
                sourcePage={props.sourcePage}
                baseRef={overlay}
                onPageChange={setSourcePage}
                open={menuOpen}
                landscape={landscape}
            />
            {book.long_strip ? (
                <LongStripPages
                    book={book}
                    page={activePage}
                    onPageChange={setMergedPage}
                />
            ) : (
                <CurrentPages
                    book={book}
                    pages={pages}
                    pagesIndex={mergedPage}
                    onPageChangeLeft={setPageLeft}
                    onPageChangeRight={setPageRight}
                />
            )}
        </div>
    )
}

interface LongStripPagesProps {
    book: Book
    page: number
    onPageChange(page: number): void
}

function LongStripPages({ book, page, onPageChange }: LongStripPagesProps) {
    const loaded = useRef(false)
    const currentPage = useRef(0)
    useEffect(() => {
        if (page === currentPage.current) {
            return
        }

        const img = document.querySelector<HTMLImageElement>(
            `[data-page="${page}"]`,
        )

        if (img && !isInViewport(img)) {
            img.scrollIntoView()
            loaded.current = true
        }
    }, [page, book.id])

    const scroll: JSX.UIEventHandler<HTMLDivElement> = useCallback(
        e => {
            const parent = e.currentTarget
            const box = parent.getBoundingClientRect()
            const scrollPercent =
                parent.scrollTop / (parent.scrollHeight - box.height)
            const pagesHeight = book.pages
                .map(p => p.height)
                .reduce((sum, height) => (sum += height), 0)

            const pages = book.pages.filter(p => p.type !== PageType.Deleted)
            let currentPagePercent = 0
            let i = 0
            for (const page of pages) {
                currentPagePercent += page.height / pagesHeight
                if (currentPagePercent > scrollPercent) {
                    if (currentPage.current !== i) {
                        currentPage.current = i
                        onPageChange(i)
                    }
                    return
                }
                i++
            }
        },
        [book.pages, onPageChange],
    )

    return (
        <div className={styles.longStrip} onScroll={scroll}>
            {book.pages
                .filter(p => p.type !== PageType.Deleted)
                .map((p, i) => (
                    <PageImage
                        class={styles.longStripPage}
                        key={p.url}
                        page={p}
                        data-page={i}
                    />
                ))}
        </div>
    )
}

interface CurrentPagesProps {
    book: Book
    pages: MergedPages
    pagesIndex: number
    onPageChangeRight(): void
    onPageChangeLeft(): void
}

function CurrentPages({
    book,
    pages,
    pagesIndex,
    onPageChangeLeft,
    onPageChangeRight,
}: CurrentPagesProps) {
    const root = useRef<HTMLDivElement>(null)
    const swipeStart = useRef<{ x: number; y: number }>()
    const swipeCurrent = useRef<{ x: number; y: number }>()
    const swiped = useRef(false)
    const action = useRef<'left' | 'right' | 'none'>('none')

    const down = useCallback((e: MouseEvent | TouchEvent) => {
        swipeStart.current = getPoint(e)
        root.current?.classList.remove(styles.turningLeft)
        root.current?.classList.remove(styles.turningRight)
    }, [])

    const move = useCallback((e: MouseEvent | TouchEvent) => {
        if (!swipeStart.current || !root.current) {
            return
        }

        swipeCurrent.current = getPoint(e)
        const dx = swipeCurrent.current.x - swipeStart.current.x

        root.current.style.setProperty('--offset', dx + 'px')
        root.current.classList.add(styles.moving)

        if (dx > 0) {
            root.current?.classList.add(styles.turningLeft)
            root.current?.classList.remove(styles.turningRight)
        } else {
            root.current?.classList.add(styles.turningRight)
            root.current?.classList.remove(styles.turningLeft)
        }
    }, [])

    const up = useCallback(() => {
        root.current?.style.removeProperty('--offset')
        root.current?.classList.remove(styles.moving)

        if (!swipeStart.current) {
            return
        }

        const current = swipeCurrent.current ?? swipeStart.current
        const dx = swipeStart.current.x - current.x

        swipeStart.current = undefined
        swipeCurrent.current = undefined

        if (Math.abs(dx) < 20) {
            swiped.current = false
            return
        }

        swiped.current = true

        if (Math.abs(dx) < 65) {
            return
        }
        if (dx > 0) {
            root.current?.style.setProperty('--offset', '-100%')
            action.current = 'right'
        } else {
            root.current?.style.setProperty('--offset', '100%')
            action.current = 'left'
        }
        root.current?.classList.remove(styles.moving)
    }, [])

    const click = useCallback((e: MouseEvent) => {
        if (swiped.current) {
            swiped.current = false
            e.preventDefault()
            e.stopPropagation()
        }
    }, [])

    const transitionEnd = useCallback(() => {
        const act = action.current
        root.current?.style.removeProperty('--offset')
        action.current = 'none'
        root.current?.classList.add(styles.moving)
        switch (act) {
            case 'left':
                onPageChangeLeft()
                break
            case 'right':
                onPageChangeRight()
                break
            case 'none':
                break
        }
    }, [onPageChangeLeft, onPageChangeRight])

    const prev = pages[pagesIndex - 1]
    const curr = pages[pagesIndex]
    const next = pages[pagesIndex + 1]
    return (
        <div
            class={styles.pageList}
            onMouseDown={down}
            onTouchStart={down}
            onMouseUp={up}
            onTouchEnd={up}
            onMouseMove={move}
            onTouchMove={move}
            onClick={click}
            ref={root}
        >
            {prev && (
                <PageView
                    key={book.id + (pagesIndex - 1)}
                    previous
                    pages={prev}
                />
            )}
            <PageView
                key={book.id + pagesIndex}
                current
                pages={curr}
                onTransitionEnd={transitionEnd}
            />
            {next && (
                <PageView key={book.id + (pagesIndex + 1)} next pages={next} />
            )}
        </div>
    )
}

interface PageProps {
    pages: [Page] | [Page, Page] | undefined
    previous?: boolean
    current?: boolean
    next?: boolean
    onTransitionEnd?: () => void
}

const PageView: FunctionalComponent<PageProps> = props => {
    const pages = props.pages

    if (pages === undefined) {
        return (
            <div class={styles.page}>
                <img src={noCover} alt='page' />
            </div>
        )
    }

    return (
        <div
            class={classNames(styles.page, {
                [styles.twoPage]: pages.length > 1,
                [styles.previous]: props.previous,
                [styles.current]: props.current,
                [styles.next]: props.next,
            })}
            onTransitionEnd={props.onTransitionEnd}
        >
            {pages.map(p => (
                <PageImage key={p.url} page={p} />
            ))}
        </div>
    )
}

interface PageImageProps extends h.JSX.HTMLAttributes<HTMLImageElement> {
    page: Page
    onPageVisible?: () => void
}
const PageImage: FunctionalComponent<PageImageProps> = ({
    page,
    onPageVisible,
    ...props
}) => {
    const [encode, setEncode] = useState(false)
    const url = usePageURL(page, undefined, { encode })
    const img = useRef<HTMLImageElement>(null)
    useEffect(() => {
        if (onPageVisible === undefined) {
            return
        }
        const imageElement = img.current
        if (imageElement !== null) {
            const lazyImageObserver = new IntersectionObserver(entries => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        onPageVisible()
                    }
                }
            })

            lazyImageObserver.observe(imageElement)

            return () => {
                lazyImageObserver.unobserve(imageElement)
            }
        }
    }, [img, onPageVisible])
    const imageError = useCallback(() => {
        setEncode(true)
    }, [])
    return (
        <img
            {...props}
            style={{
                '--width': page.width,
                '--height': page.height,
            }}
            ref={img}
            src={url}
            loading='lazy'
            onError={imageError}
        />
    )
}

function isInViewport(el: HTMLElement): boolean {
    const { top, left, bottom, right } = el.getBoundingClientRect()
    const { innerHeight, innerWidth } = window

    return (
        ((top > 0 && top <= innerHeight) ||
            (bottom > 0 && bottom <= innerHeight)) &&
        ((left > 0 && left <= innerWidth) || (right > 0 && right <= innerWidth))
    )
}

function getPoint(e: MouseEvent | TouchEvent): { x: number; y: number } {
    if (e instanceof MouseEvent) {
        return { x: e.x, y: e.y }
    }
    const touch = e.touches[0]
    return { x: touch?.clientX ?? 0, y: touch?.clientY ?? 0 }
}
