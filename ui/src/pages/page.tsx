import noImage from 'asset-url:../../res/images/no-cover.svg';
import { FunctionalComponent, h } from "preact";
import { route } from 'preact-router';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { book } from "../api";
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
    useEffect(() => {
        preloadImages([
            b.pages[page+1]?.url,
            b.pages[page-1]?.url,
        ])
    }, [page])

    const [menuOpen, setMenuOpen] = useState(false);

    const click = useCallback((event: MouseEvent) => {
        setMenuOpen(open => {
            if (open) {
                return false
            } 
                const section = ['left', 'center', 'right'][Math.floor(event.pageX / window.innerWidth * 3)]
                switch (section) {
                    case 'left':
                        route(`/book/${id}/${page-1}`)
                        break
                    case 'right':
                        route(`/book/${id}/${page+1}`)
                        break
                    case 'center':
                        return true
                }
                return open
            
        })
    }, [setMenuOpen, id, page])

    const image = b.pages[page]?.url ?? noImage
    return <div class={classNames(styles.page, {[styles.menuOpen]: menuOpen})} onClick={click}>
        <img class={styles.image} src={image} alt="" />
        <div class={styles.overlay}>
            <div class={styles.slider}>slider</div>
        </div>
    </div>
}