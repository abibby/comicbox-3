import { bind } from '@zwzn/spicy'
import noCover from 'res/images/no-cover.svg'
import { FunctionalComponent, h, JSX } from 'preact'
import { route as navigate } from 'preact-router'
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import { book } from 'src/api'
import { persist, useCached } from 'src/cache'
import classNames from 'src/classnames'
import { Overlay } from 'src/components/reading-overlay'
import { DB } from 'src/database'
import { useNextBook, usePreviousBook } from 'src/hooks/book'
import { useWindowEvent } from 'src/hooks/event-listener'
import { usePageURL } from 'src/hooks/page'
import { useMediaQuery } from 'src/hooks/use-media-query'
import { Book, Page, PageType } from 'src/models'
import { Error404 } from 'src/pages/errors'
import styles from 'src/pages/book-view.module.css'
import { route } from 'src/routes'
import { updateAnilist } from 'src/services/anilist-service'
import {
    MergedPages,
    translate,
    useMergedPages,
} from 'src/services/book-service'

interface BookViewProps {
    matches?: {
        id: string
        page: string
    }
}

export const BookView: FunctionalComponent<BookViewProps> = props => {
    const id = props.matches?.id ?? ''

    const books = useCached(`page:${id}`, { id: id }, DB.books, book.list)
    const b = books?.[0]

    if (b === undefined) {
        return <Error404 />
    }
    let sourcePage = 0

    if (props.matches?.page) {
        sourcePage = Number(props.matches.page)
    } else if (b.user_book?.current_page) {
        sourcePage = b.user_book.current_page
    }

    return <Reader book={b} sourcePage={sourcePage} />
}

interface ReaderProps {
    book: Book
    sourcePage: number
}

const Reader: FunctionalComponent<ReaderProps> = props => {
    const b = props.book
    const activePage = translate(b, props.sourcePage)
        .from('sourcePage')
        .to('activePage')
    const rtl = b.rtl

    const landscape = useMediaQuery('(orientation: landscape)')
    const pages = useMergedPages(b.pages, b.long_strip, landscape)
    const mergedPage = translate(b, props.sourcePage)
        .from('sourcePage')
        .toMerged(pages)

    const nextBook = useNextBook(b)
    const previousBook = usePreviousBook(b)

    const bookID = b.id
    const nextBookID = nextBook?.id
    const previousBookID = previousBook?.id
    const setSourcePage = useCallback(
        async (newPage: number) => {
            navigate(route('book.view', { id: bookID, page: newPage }))

            const b = await DB.books.where('id').equals(bookID).first()
            if (b === undefined) {
                return
            }
            await DB.saveBook(b, {
                user_book: {
                    current_page: newPage,
                },
            })
            const s = await DB.series.where('name').equals(b.series).first()
            if (s !== undefined) {
                await DB.saveSeries(s, {
                    user_series: {
                        last_read_at: new Date().toISOString(),
                    },
                })
            }
            await persist(true)
        },
        [bookID],
    )

    const setMergedPage = useCallback(
        async (newMergedPage: number) => {
            if (newMergedPage === mergedPage) {
                return
            }
            if (Number(newMergedPage) >= pages.length) {
                void updateAnilist(b)
                if (nextBookID) {
                    navigate(route('book.view', { id: nextBookID }))
                } else {
                    navigate(route('home', {}))
                }
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

            const newPage = translate(b, newMergedPage)
                .fromMerged(pages)
                .to('sourcePage')

            await setSourcePage(newPage)
        },
        [b, nextBookID, pages, mergedPage, previousBookID, setSourcePage],
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
            }
        },
        [setPageLeft, setPageRight],
    )

    return (
        <div
            class={classNames(styles.reader, {
                [styles.menuOpen]: menuOpen,
                [styles.rtl]: b.rtl,
            })}
            onClick={click}
        >
            <div class={styles.direction}>
                <svg viewBox='0 0 30 15'>
                    <path d='M0,4 H22.5 V0 L30,7.5 L22.5,15 V11 H0 z' />
                </svg>
            </div>
            <Overlay
                book={b}
                sourcePage={props.sourcePage}
                baseRef={overlay}
                onPageChange={setSourcePage}
                open={menuOpen}
                landscape={landscape}
            />
            {b.long_strip ? (
                <LongStripPages
                    book={b}
                    page={activePage}
                    onPageChange={setMergedPage}
                />
            ) : (
                <CurrentPages
                    book={b}
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
    const [loaded, setLoaded] = useState(false)

    useEffect(() => {
        if (!book.long_strip) {
            return
        }
        const img = document.querySelector<HTMLImageElement>(
            `[data-page="${page}"]`,
        )

        if (img && !isInViewport(img)) {
            img.scrollIntoView()
            setLoaded(true)
        }
    }, [book.long_strip, page])

    const setCurrentPageLongStrip = useCallback(
        (newPage: number) => {
            if (!loaded) {
                return
            }

            onPageChange(newPage)
        },
        [loaded, onPageChange],
    )
    return (
        <div className={styles.longStrip}>
            {book.pages
                .filter(p => p.type !== PageType.Deleted)
                .map((p, i) => (
                    <PageImage
                        class={styles.longStripPage}
                        key={p.url}
                        page={p}
                        data-page={i}
                        onPageVisible={bind(i, setCurrentPageLongStrip)}
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
    const url = usePageURL(page)
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
