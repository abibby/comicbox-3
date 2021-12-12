import { bindValue } from '@zwzn/spicy'
import { FunctionalComponent, h, RefObject } from 'preact'
import { route } from 'preact-router'
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import { useNextBook, usePreviousBook } from 'src/hooks/book'
import { useWindowEvent } from 'src/hooks/event-listener'
import { useResizeEffect } from 'src/hooks/resize-effect'
import { book } from '../api'
import { persist, useCached } from '../cache'
import classNames from '../classnames'
import { EditBook } from '../components/book-edit'
import { openModal } from '../components/modal'
import { DB } from '../database'
import { usePageURL } from '../hooks/page'
import { Book, Page, PageType } from '../models'
import { Error404 } from './404'
import styles from './book-view.module.css'

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
        page = pageUnindex(b, b.user_book?.current_page)
    }

    return <Reader book={b} page={page} />
}

interface ReaderProps {
    book: Book
    page: number
}

const Reader: FunctionalComponent<ReaderProps> = props => {
    const b = props.book
    const page = props.page
    const rtl = b.rtl

    const [landscape, setLandscape] = useState(
        window.innerWidth > window.innerHeight,
    )
    useResizeEffect(() => {
        setLandscape(window.innerWidth > window.innerHeight)
    }, [])

    const pages = splitPages(b, landscape)
    const pageCount = pages.length

    const pageList = useRef<HTMLDivElement>(null)
    const getCurrentIndex = useCallback(() => {
        const currentScroll = Math.abs(pageList.current?.scrollLeft ?? 0)
        const maxScroll = pageList.current?.scrollWidth ?? 0
        return Math.round((currentScroll / maxScroll) * pageCount)
    }, [pageCount])
    const getCurrentPage = useCallback(() => {
        const currentIndex = getCurrentIndex()

        let currentPage = 0
        for (const page of pages.slice(0, currentIndex + 1)) {
            currentPage += page.length
        }
        return currentPage
    }, [getCurrentIndex, pages])

    const nextBook = useNextBook(`read:${b.id}:next`, b)
    const previousBook = usePreviousBook(`read:${b.id}:previous`, b)

    const setCurrentIndex = useCallback(
        async (newIndex: number | string) => {
            if (newIndex >= pageCount) {
                if (nextBook) {
                    route(
                        `/book/${nextBook.id}/${
                            nextBook.user_book?.current_page ?? 0
                        }`,
                    )
                } else {
                    route(`/`)
                }
            }
            if (newIndex < 0) {
                if (previousBook) {
                    route(
                        `/book/${previousBook.id}/${
                            previousBook.user_book?.current_page ?? 0
                        }`,
                    )
                } else {
                    route(`/`)
                }
            }

            const maxScroll = pageList.current?.scrollWidth ?? 0

            const invert = rtl ? -1 : 1
            pageList.current?.scroll({
                left: (maxScroll / pageCount) * Number(newIndex) * invert,
            })
        },
        [nextBook, pageCount, previousBook, rtl],
    )
    const updateCurrentIndex = useCallback(
        (offset: number) => {
            setCurrentIndex(getCurrentIndex() + offset)
        },
        [getCurrentIndex, setCurrentIndex],
    )
    const setCurrentPage = useCallback(
        (newPage: number) => {
            let currentPage = 0
            for (const [i, page] of pages.entries()) {
                currentPage += page.length
                if (currentPage > newPage) {
                    setCurrentIndex(i)
                    return
                }
            }
        },
        [pages, setCurrentIndex],
    )

    const lastPage = useRef(-1)
    const scroll = useCallback(() => {
        const currentPage = getCurrentPage()
        if (lastPage.current !== currentPage) {
            route(`/book/${b.id}/${currentPage}`, true)
            lastPage.current = currentPage

            DB.saveBook(b, {
                user_book: {
                    current_page: pageIndex(b, currentPage),
                },
            })
            persist(true)
        }
    }, [b, getCurrentPage])

    useEffect(() => {
        const currentPage = getCurrentPage()
        if (page !== currentPage) {
            setCurrentPage(page)
        }
    }, [getCurrentPage, page, setCurrentPage])

    let leftOffset = -1
    let rightOffset = +1

    if (rtl) {
        ;[leftOffset, rightOffset] = [rightOffset, leftOffset]
    }
    const [menuOpen, setMenuOpen] = useState(false)
    const overlay = useRef<HTMLDivElement>(null)
    const click = useCallback(
        (event: MouseEvent) => {
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
                    updateCurrentIndex(leftOffset)
                    break
                case 'right':
                    updateCurrentIndex(rightOffset)
                    break
                case 'center':
                    setMenuOpen(true)
                    return
            }
        },
        [leftOffset, menuOpen, rightOffset, updateCurrentIndex],
    )

    useWindowEvent(
        'keydown',
        e => {
            e.preventDefault()
            switch (e.key) {
                case 'ArrowLeft':
                    updateCurrentIndex(leftOffset)
                    break
                case 'ArrowRight':
                    updateCurrentIndex(rightOffset)
                    break
            }
        },
        [],
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
                page={page}
                pageCount={pages.length}
                baseRef={overlay}
                changePage={setCurrentIndex}
            />
            <div class={styles.pageList} ref={pageList} onScroll={scroll}>
                {pages.map(p => (
                    <PageView pages={p} />
                ))}
            </div>
        </div>
    )
}

interface OverlayProps {
    book: Book
    page: number
    pageCount: number
    baseRef: RefObject<HTMLDivElement>
    changePage: (page: number | string) => void
}

const Overlay: FunctionalComponent<OverlayProps> = props => {
    const b = props.book
    const edit = useCallback(() => {
        openModal(EditBook, { book: b })
    }, [b])

    return (
        <div class={styles.overlay} ref={props.baseRef}>
            <button type='button' onClick={edit}>
                Edit
            </button>
            <div class={styles.slider}>
                <input
                    class={styles.range}
                    type='range'
                    value={props.page}
                    min={0}
                    max={props.pageCount}
                    onChange={bindValue(props.changePage)}
                />
                <input
                    class={styles.number}
                    type='number'
                    value={props.page}
                    min={0}
                    max={props.pageCount}
                    onChange={bindValue(props.changePage)}
                />
            </div>
        </div>
    )
}

interface PageProps {
    pages: [Page] | [Page, Page]
}

const PageView: FunctionalComponent<PageProps> = props => {
    const pages = props.pages

    return (
        <div
            class={classNames(styles.page, {
                [styles.twoPage]: pages.length > 1,
            })}
        >
            {pages.map(p => (
                <PageImage page={p} />
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

function splitPages(
    book: Book,
    twoPage: boolean,
): Array<[Page] | [Page, Page]> {
    const pages: Array<[Page] | [Page, Page]> = []
    const pageCount = book.pages.filter(p => p.type !== PageType.Deleted).length

    for (let i = 0; i < pageCount; i++) {
        const page = getPage(book, i)
        const nextPage = getPage(book, i + 1)
        if (page === undefined) {
            continue
        }
        if (nextPage && showTwoPages(twoPage, page, nextPage)) {
            pages.push([page, nextPage])
            i++
        } else {
            pages.push([page])
        }
    }
    return pages
}

function getPage(book: Book, page: number): Page | undefined {
    let currentPage = -1
    for (const p of book.pages) {
        if (p.type !== PageType.Deleted) {
            currentPage++
        }

        if (currentPage === page) {
            return p
        }
    }
    return undefined
}

function pageIndex(book: Book, page: number): number {
    let currentPage = -1
    for (const [i, p] of book.pages.entries()) {
        if (p.type !== PageType.Deleted) {
            currentPage++
        }

        if (currentPage === page) {
            console.log(page, i)

            return i
        }
    }
    return page
}

function pageUnindex(book: Book, page: number): number {
    return book.pages.slice(0, page).filter(p => p.type !== PageType.Deleted)
        .length
}

function showTwoPages(
    towPage: boolean,
    currentPage: Page,
    nextPage: Page,
): boolean {
    if (
        currentPage.type === PageType.SpreadSplit &&
        nextPage.type === PageType.SpreadSplit
    ) {
        return true
    }
    if (
        towPage &&
        currentPage.type === PageType.Story &&
        nextPage.type === PageType.Story
    ) {
        return true
    }
    return false
}
