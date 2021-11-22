import { bindValue } from '@zwzn/spicy'
import { FunctionalComponent, h } from 'preact'
import { route } from 'preact-router'
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import { book, pageURL } from '../api'
import { persist, useCached } from '../cache'
import classNames from '../classnames'
import { EditBook } from '../components/book-edit'
import { openModal } from '../components/modal'
import { DB } from '../database'
import { useNextBook, usePreviousBook } from '../hooks/book'
import { useWindowEvent } from '../hooks/event-listener'
import { usePageURL } from '../hooks/page'
import { Book, PageType } from '../models'
import { Error404 } from './404'
import styles from './page.module.css'

interface PageProps {
    matches?: {
        id: string
        page: string
    }
}

function preloadImages(srcs: Array<Promise<string>>) {
    return Promise.all(srcs).then(srcs => {
        srcs.map(src => {
            const img = new Image()
            img.src = src
            return img
        })
    })
}

export const Page: FunctionalComponent<PageProps> = props => {
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

    return <PageContent book={b} page={page} />
}

export interface PageContentProps {
    book: Book
    page: number
}

export const PageContent: FunctionalComponent<PageContentProps> = props => {
    const b = props.book
    const page = props.page

    const previous = usePreviousBook(`page:${b.id}:previous`, b)
    const next = useNextBook(`page:${b.id}:next`, b)

    const [twoPage, setTwoPage] = useState(true)
    let nextPage = page + 1
    let previousPage = page - 1

    const pageCount =
        b.pages.filter(p => p.type !== PageType.Deleted).length - 1

    const twoPagesVisible = twoPage && canShowTwoPages(b, page, pageCount)

    if (twoPage && canShowTwoPages(b, page - 2, pageCount)) {
        previousPage = page - 2
    }

    if (twoPagesVisible) {
        nextPage = page + 2
    }

    let leftPage = previousPage
    let rightPage = nextPage
    if (b.rtl) {
        leftPage = nextPage
        rightPage = previousPage
    }

    useEffect(() => {
        // TODO: preload images from next and previous books
        preloadImages([
            pageURL(b, page - 2),
            pageURL(b, page - 1),
            pageURL(b, page + 1),
            pageURL(b, page + 2),
        ])
    }, [b, page])

    const [menuOpen, setMenuOpen] = useState(false)

    const previousID = previous?.id
    const nextID = next?.id
    const changePage = useCallback(
        (newPage: number | string) => {
            if (newPage < 0) {
                if (previousID !== undefined) {
                    route(`/book/${previousID}`)
                } else {
                    route('/')
                }
            } else if (newPage > pageCount) {
                if (nextID !== undefined) {
                    route(`/book/${nextID}`)
                } else {
                    route('/')
                }
            } else {
                DB.saveBook(b, {
                    user_book: {
                        current_page: pageIndex(b, Number(newPage)),
                    },
                })
                persist(true)
                route(`/book/${b.id}/${newPage}`, true)
            }
        },
        [b, previousID, nextID, pageCount],
    )
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
                    changePage(leftPage)
                    break
                case 'right':
                    changePage(rightPage)
                    break
                case 'center':
                    setMenuOpen(true)
                    return
            }
        },
        [menuOpen, setMenuOpen, changePage, leftPage, rightPage],
    )

    const edit = useCallback(() => {
        openModal(EditBook, {
            book: b,
        })
    }, [b])

    useWindowEvent(
        'keydown',
        (e: KeyboardEvent) => {
            if (menuOpen) {
                return
            }
            switch (e.key) {
                case 'ArrowLeft':
                    changePage(leftPage)
                    break
                case 'ArrowRight':
                    changePage(rightPage)
                    break
                case 'ArrowUp':
                    setTwoPage(true)
                    break
                case 'ArrowDown':
                    setTwoPage(false)
                    break
            }
        },
        [menuOpen, page, changePage, setTwoPage],
    )

    const currentPageURL = usePageURL(b, pageIndex(b, page))
    const nextPageURL = usePageURL(b, pageIndex(b, page + 1))
    return (
        <div
            class={classNames(styles.page, {
                [styles.menuOpen]: menuOpen,
                [styles.twoPage]: twoPagesVisible,
                [styles.rtl]: b.rtl,
            })}
            onClick={click}
        >
            <img class={styles.image} src={currentPageURL} />
            {twoPagesVisible && <img class={styles.image} src={nextPageURL} />}

            <div class={styles.direction}>
                <svg viewBox='0 0 200 100'>
                    <path d='M0,20 H150 V0 L200,50 L150,100 V80 H0 z' />
                </svg>
            </div>
            <div class={styles.overlay} ref={overlay}>
                <button type='button' onClick={edit}>
                    Edit
                </button>
                <div class={styles.slider}>
                    <input
                        class={styles.range}
                        type='range'
                        value={page}
                        min={0}
                        max={pageCount}
                        onChange={bindValue(changePage)}
                    />
                    <input
                        class={styles.number}
                        type='number'
                        value={page}
                        min={0}
                        max={pageCount}
                        onChange={bindValue(changePage)}
                    />
                </div>
            </div>
        </div>
    )
}

function pageIndex(book: Book, page: number): number {
    let currentPage = -1
    for (const [i, p] of book.pages.entries()) {
        if (p.type !== PageType.Deleted) {
            currentPage++
        }

        if (currentPage === page) {
            return i
        }
    }
    return page
}

function pageUnindex(book: Book, page: number): number {
    return book.pages.slice(0, page).filter(p => p.type !== PageType.Deleted)
        .length
}

function canShowTwoPages(b: Book, page: number, pageCount: number): boolean {
    if (page + 1 > pageCount) {
        return false
    }
    if (
        b.pages[pageIndex(b, page)]?.type === PageType.Story &&
        b.pages[pageIndex(b, page + 1)]?.type === PageType.Story
    ) {
        return true
    }
    if (
        b.pages[pageIndex(b, page)]?.type === PageType.SpreadSplit &&
        b.pages[pageIndex(b, page + 1)]?.type === PageType.SpreadSplit
    ) {
        return true
    }
    return false
}
