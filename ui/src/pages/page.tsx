import { FunctionalComponent, h } from "preact";
import { route } from 'preact-router';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { book, pageURL, userBook } from "../api";
import classNames from '../classnames';
import { DB } from '../database';
import { useCached } from '../hooks/cached';
import { Error404 } from './404';
import styles from './page.module.css';

interface PageProps {
    matches?: {
        id: string
        page: string
    }
}

function notNullish<T>(v: T | null | undefined): v is T{
    return v !== undefined && v !== null
}

function preloadImages(srcs: Array<string|undefined>): HTMLImageElement[] {
    return srcs.filter(notNullish).map(src => {
        const img = new Image()
        img.src = src
        return img
    })
}

export const Page: FunctionalComponent<PageProps> = props => {
    const id = props.matches?.id ?? ''
    const page = Number(props.matches?.page || 0)

    const books = useCached(`page:${id}`, { id: id }, DB.books, book.list, book.cachedList)

    const b = books?.[0]
    if (b === undefined) {
        return <Error404 />
    }

    const nextResponse = useCached(`page:${id}:next`, {  series: b.series, after_id: id, limit: 1 }, DB.books, book.list, book.cachedList)
    const previousResponse = useCached(`page:${id}:previous`, {  series: b.series, before_id: id, limit: 1, order: "desc"  }, DB.books, book.list, book.cachedList)
    const previous = previousResponse?.[0]
    const next = nextResponse?.[0]

    useEffect(() => {
        // TODO: preload images from next and previous books
        preloadImages([
            pageURL(b, page+1),
            pageURL(b, page-1),
        ])
    }, [page, previous?.id, next?.id])

    const [menuOpen, setMenuOpen] = useState(false);

    const click = useCallback((event: MouseEvent) => {
        if (menuOpen) {
            setMenuOpen(false)
            return
        }

        const section = ['left', 'center', 'right'][Math.floor(event.pageX / window.innerWidth * 3)]
        let newPage = page
        switch (section) {
            case 'left':
                newPage--
                break
            case 'right':
                newPage++
                break
            case 'center':
                setMenuOpen(true)
        }

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
            userBook.update(id, {
                current_page: newPage
            })
            route(`/book/${id}/${newPage}`)
        }
    }, [menuOpen, setMenuOpen, id, page, previous?.id, next?.id])

    return <div class={classNames(styles.page, {[styles.menuOpen]: menuOpen})} onClick={click}>
        <img class={styles.image} src={pageURL(b, page)} />
        <div class={styles.overlay}>
            <div class={styles.slider}>slider</div>
        </div>
    </div>
}
