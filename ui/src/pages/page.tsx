import { FunctionalComponent, h } from 'preact'
import { route } from 'preact-router'
import { useCallback, useEffect, useState } from 'preact/hooks'
import { auth, book, pageURL } from '../api'
import { useCached } from '../cache'
import classNames from '../classnames'
import { DB } from '../database'
import { useNextBook, usePreviousBook } from '../hooks/book'
import { useWindowEvent } from '../hooks/event-listener'
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
    const twoPagesVisible = twoPage && b.pages[page]?.type === 'Story'
    if (twoPagesVisible) {
        nextPage = page + 2
        previousPage = page - 2
        if (previousPage < 0) {
            previousPage = 0
        }
        if (nextPage >= b.pages.length) {
            nextPage = b.pages.length - 1
        }
    }

    useEffect(() => {
        // TODO: preload images from next and previous books
        preloadImages([pageURL(b, page + 1), pageURL(b, page - 1)])
    }, [page, previous?.id, next?.id])

    const [menuOpen, setMenuOpen] = useState(false)

    const changePage = useCallback(
        (newPage: number) => {
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
                        current_page: newPage,
                    }
                }
                DB.books.put(b)
                DB.persist(true)
                route(`/book/${id}/${newPage}`)
            }
        },
        [id, previous?.id, next?.id],
    )
    const click = useCallback(
        (event: MouseEvent) => {
            if (menuOpen) {
                setMenuOpen(false)
                return
            }

            const section = ['left', 'center', 'right'][
                Math.floor((event.pageX / window.innerWidth) * 3)
            ]
            switch (section) {
                case 'left':
                    changePage(previousPage)
                    break
                case 'right':
                    changePage(nextPage)
                    break
                case 'center':
                    setMenuOpen(true)
                    return
            }
        },
        [page, menuOpen, setMenuOpen, changePage],
    )

    useWindowEvent(
        'keydown',
        (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowLeft':
                    changePage(previousPage)
                    break
                case 'ArrowRight':
                    changePage(nextPage)
                    break
                case 'ArrowUp':
                    setTwoPage(true)
                    break
                case 'ArrowDown':
                    setTwoPage(false)
                    break
            }
        },
        [page, changePage, setTwoPage],
    )

    return (
        <div
            class={classNames(styles.page, {
                [styles.menuOpen]: menuOpen,
                [styles.twoPage]: twoPagesVisible,
            })}
            onClick={click}
        >
            <img class={styles.image} src={pageURL(b, page)} />
            {twoPage && <img class={styles.image} src={pageURL(b, page + 1)} />}

            <div class={styles.overlay}>
                <pre>{JSON.stringify(b.pages[page], undefined, '   ')}</pre>
                <div class={styles.slider}>slider</div>
            </div>
        </div>
    )
}
