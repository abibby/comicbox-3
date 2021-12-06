import { FunctionalComponent, h } from 'preact'
import { route } from 'preact-router'
import { useCallback, useEffect, useRef } from 'preact/hooks'
import { book } from '../api'
import { useCached } from '../cache'
import classNames from '../classnames'
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
    const bookID = b.id
    const rtl = b.rtl

    const pages = splitPages(b, false)
    const pageCount = pages.length

    const pageList = useRef<HTMLDivElement>(null)
    const lastPage = useRef(-1)
    const scroll = useCallback(() => {
        const currentScroll = Math.abs(pageList.current?.scrollLeft ?? 0)
        const maxScroll = pageList.current?.scrollWidth ?? 0
        const currentPage = Math.round((currentScroll / maxScroll) * pageCount)
        if (lastPage.current !== currentPage) {
            route(`/book/${bookID}/${currentPage}`, true)
            lastPage.current = currentPage
        }
    }, [bookID, pageCount])

    useEffect(() => {
        const currentScroll = Math.abs(pageList.current?.scrollLeft ?? 0)
        const maxScroll = pageList.current?.scrollWidth ?? 0
        const currentPage = Math.round((currentScroll / maxScroll) * pageCount)
        if (page !== currentPage) {
            const invert = rtl ? -1 : 1
            pageList.current?.scroll((maxScroll / pageCount) * page * invert, 0)
        }
    }, [bookID, page, pageCount, rtl])

    return (
        <div class={styles.reader}>
            <div
                class={classNames(styles.pageList, {
                    // [styles.menuOpen]: menuOpen,
                    [styles.rtl]: b.rtl,
                })}
                ref={pageList}
                onScroll={scroll}
            >
                {pages.map(p => (
                    <PageView pages={p} />
                ))}
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
