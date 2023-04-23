import noCover from 'asset-url:res/images/no-cover.svg'
import { FunctionalComponent, h, JSX } from 'preact'
import { route as changeRoute } from 'preact-router'
import { useCallback, useRef, useState } from 'preact/hooks'
import { book } from 'src/api'
import { persist, useCached } from 'src/cache'
import classNames from 'src/classnames'
import { Overlay } from 'src/components/reading-overlay'
import { DB } from 'src/database'
import { useNextBook, usePreviousBook } from 'src/hooks/book'
import { useWindowEvent } from 'src/hooks/event-listener'
import { usePageURL } from 'src/hooks/page'
import { useMediaQuery } from 'src/hooks/use-media-query'
import { Book, Page } from 'src/models'
import { Error404 } from 'src/pages/404'
import styles from 'src/pages/book-view.module.css'
import { route } from 'src/routes'
import { updateAnilist } from 'src/services/anilist-service'
import { splitPages } from 'src/services/book-service'

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
    let page = 0

    if (props.matches?.page) {
        page = Number(props.matches.page)
    } else if (b.user_book?.current_page) {
        page = b.user_book?.current_page
    }

    return <Reader book={b} page={pageUnindex(b, page)} />
}

interface ReaderProps {
    book: Book
    page: number
}

const Reader: FunctionalComponent<ReaderProps> = props => {
    const b = props.book
    const page = props.page
    const rtl = b.rtl
    const landscape = useMediaQuery('(orientation: landscape)')

    const pages = splitPages(b.pages, landscape)
    const pagesIndex = getPagesIndex(pages, page)

    const nextBook = useNextBook(`read:${b.id}:next`, b)
    const previousBook = usePreviousBook(`read:${b.id}:previous`, b)

    const nextBookID = nextBook?.id
    const previousBookID = previousBook?.id

    const setCurrentIndex = useCallback(
        (newIndex: number | string) => {
            if (Number(newIndex) >= pages.length) {
                updateAnilist(b)
                if (nextBookID) {
                    changeRoute(route('book.view', { id: nextBookID }))
                } else {
                    changeRoute(route('home', {}))
                }
                return
            }
            if (Number(newIndex) < 0) {
                if (previousBookID) {
                    changeRoute(route('book.view', { id: previousBookID }))
                } else {
                    changeRoute(route('home', {}))
                }
                return
            }

            const newPage = pageIndex(
                b,
                pages.slice(0, Number(newIndex) + 1).flat().length - 1,
            )

            ;(async () => {
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
            })()

            changeRoute(route('book.view', { id: b.id, page: newPage }))
        },
        [b, nextBookID, pages, previousBookID],
    )

    let leftOffset = -1
    let rightOffset = +1

    if (rtl) {
        leftOffset = +1
        rightOffset = -1
    }
    const [menuOpen, setMenuOpen] = useState(false)
    const overlay = useRef<HTMLDivElement>(null)
    const click = useCallback(
        (event: JSX.TargetedMouseEvent<HTMLDivElement>) => {
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
                    setCurrentIndex(pagesIndex + leftOffset)
                    break
                case 'right':
                    setCurrentIndex(pagesIndex + rightOffset)
                    break
                case 'center':
                    setMenuOpen(true)
                    return
            }
        },
        [leftOffset, rightOffset, menuOpen, pagesIndex, setCurrentIndex],
    )

    useWindowEvent(
        'keydown',
        e => {
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault()
                    setCurrentIndex(pagesIndex + leftOffset)
                    break
                case 'ArrowRight':
                    e.preventDefault()
                    setCurrentIndex(pagesIndex + rightOffset)
                    break
            }
        },
        [leftOffset, rightOffset, pagesIndex, setCurrentIndex],
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
                page={pagesIndex}
                pageCount={pages.length}
                baseRef={overlay}
                changePage={setCurrentIndex}
                open={menuOpen}
            />
            <div class={styles.pageList}>
                <PageView pages={pages[pagesIndex]} />
            </div>
        </div>
    )
}

interface PageProps {
    pages: [Page] | [Page, Page] | undefined
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
            })}
        >
            {pages.map(p => (
                <PageImage key={p.url} page={p} />
            ))}
        </div>
    )
}

interface PageImageProps {
    page: Page
}
const PageImage: FunctionalComponent<PageImageProps> = props => {
    const url = usePageURL(props.page)
    return <img src={url} loading='lazy' />
}

function pageIndex(book: Book, page: number): number {
    const p = book.pages.filter(p => p.type !== 'Deleted')[page]
    if (p === undefined) {
        return -1
    }
    let currentPage = book.pages.indexOf(p)
    for (
        let i = Math.min(currentPage + 1, book.pages.length);
        i < book.pages.length;
        i++
    ) {
        if (book.pages[i]?.type === 'Deleted') {
            currentPage = i
        } else {
            break
        }
    }
    return currentPage
}

function pageUnindex(book: Book, page: number): number {
    let out = -1
    for (let i = 0; i < page + 1; i++) {
        if (book.pages[i]?.type !== 'Deleted') {
            out++
        }
    }
    return out
}

function getPagesIndex(
    pages: Array<[Page] | [Page, Page]>,
    page: number,
): number {
    let current = 0
    for (const [i, p] of pages.entries()) {
        current += p.length
        if (current > page) {
            return i
        }
    }
    return -1
}
