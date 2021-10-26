import { bindValue } from '@zwzn/spicy'
import { FunctionalComponent, h } from 'preact'
import { route } from 'preact-router'
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import { auth, book, pageURL } from '../api'
import { useCached } from '../cache'
import classNames from '../classnames'
import { EditBook } from '../components/book-edit'
import { openModal } from '../components/modal'
import { DB } from '../database'
import { useNextBook, usePreviousBook } from '../hooks/book'
import { useWindowEvent } from '../hooks/event-listener'
import { PageType } from '../models'
import { Error404 } from './404'
import styles from './page.module.css'

interface PageProps {
    matches?: {
        id: string
        page: string
    }
}

function notNullish<T>(v: T | null | undefined): v is T {
    return v !== undefined && v !== null
}

function preloadImages(srcs: Array<string | undefined>): HTMLImageElement[] {
    return srcs.filter(notNullish).map(src => {
        const img = new Image()
        img.src = src
        return img
    })
}

export const Page: FunctionalComponent<PageProps> = props => {
    const id = props.matches?.id ?? ''

    const books = useCached(
        `page:${id}`,
        { id: id },
        DB.books,
        book.list,
        book.cachedList,
    )

    const b = books?.[0]
    if (b === undefined) {
        return <Error404 />
    }

    const page = Number(props.matches?.page || b.user_book?.current_page || 0)

    const previous = usePreviousBook(`page:${id}:previous`, b)
    const next = useNextBook(`page:${id}:next`, b)

    const [twoPage, setTwoPage] = useState(true)
    let nextPage = page + 1
    let previousPage = page - 1

    const twoPagesVisible =
        (twoPage &&
            b.pages[page]?.type === PageType.Story &&
            b.pages[page + 1]?.type === PageType.Story) ||
        (b.pages[page]?.type === PageType.SpreadSplit &&
            b.pages[page + 1]?.type === PageType.SpreadSplit)

    if (
        (twoPage &&
            b.pages[page - 1]?.type === PageType.Story &&
            b.pages[page - 2]?.type === PageType.Story) ||
        (b.pages[page - 1]?.type === PageType.SpreadSplit &&
            b.pages[page - 2]?.type === PageType.SpreadSplit)
    ) {
        previousPage = page - 2
    }

    if (twoPagesVisible) {
        nextPage = page + 2
    }

    if (nextPage >= b.pages.length) {
        nextPage = b.pages.length - 1
    }
    if (previousPage < 0) {
        previousPage = 0
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
    }, [page, previous?.id, next?.id])

    const [menuOpen, setMenuOpen] = useState(false)

    const changePage = useCallback(
        (newPage: number | string) => {
            if (newPage < 0) {
                if (previous !== undefined) {
                    route(`/book/${previous.id}`)
                } else {
                    route('/')
                }
            } else if (newPage >= b.pages.length) {
                if (next !== undefined) {
                    route(`/book/${next.id}`)
                } else {
                    route('/')
                }
            } else {
                const userID = auth.currentID()
                if (userID !== null) {
                    b.user_book = {
                        ...b.user_book,
                        book_id: b.id,
                        user_id: userID,
                        current_page: Number(newPage),
                    }
                }
                DB.books.put(b)
                DB.persist(true)
                route(`/book/${id}/${newPage}`, true)
            }
        },
        [id, previous?.id, next?.id],
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
        [page, menuOpen, setMenuOpen, changePage],
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

    return (
        <div
            class={classNames(styles.page, {
                [styles.menuOpen]: menuOpen,
                [styles.twoPage]: twoPagesVisible,
                [styles.rtl]: b.rtl,
            })}
            onClick={click}
        >
            <img class={styles.image} src={pageURL(b, page)} />
            {twoPagesVisible && (
                <img class={styles.image} src={pageURL(b, page + 1)} />
            )}

            <div class={styles.overlay} ref={overlay}>
                <pre>{JSON.stringify(b.pages[page], undefined, '   ')}</pre>
                <button type='button' onClick={edit}>
                    Edit
                </button>
                <div class={styles.slider}>
                    <input
                        class={styles.range}
                        type='range'
                        value={page}
                        min={0}
                        max={b.pages.length}
                        onInput={bindValue(changePage)}
                    />
                    <input
                        class={styles.number}
                        type='number'
                        value={page}
                        min={0}
                        max={b.pages.length}
                        onInput={bindValue(changePage)}
                    />
                </div>
            </div>
        </div>
    )
}
