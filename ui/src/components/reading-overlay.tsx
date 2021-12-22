import { bindValue } from '@zwzn/spicy'
import { FunctionalComponent, h, RefObject } from 'preact'
import { Link } from 'preact-router'
import { useCallback } from 'preact/hooks'
import classNames from 'src/classnames'
import { Book } from 'src/models'
import { EditBook } from './book-edit'
import { openModal } from './modal'
import styles from './reading-overlay.module.css'

interface OverlayProps {
    book: Book
    page: number
    pageCount: number
    baseRef: RefObject<HTMLDivElement>
    open: boolean
    changePage: (page: number | string) => void
}

export const Overlay: FunctionalComponent<OverlayProps> = props => {
    const b = props.book
    const edit = useCallback(() => {
        openModal(EditBook, { book: b })
    }, [b])

    return (
        <div
            class={classNames(styles.overlay, {
                [styles.open]: props.open,
                [styles.rtl]: props.book.rtl,
            })}
            ref={props.baseRef}
        >
            <div class={styles.content}>
                <div class={styles.sidebar}>
                    <ul>
                        <li>
                            <a onClick={edit}>Edit</a>
                        </li>
                        <li>
                            <Link href={`/series/${b.series}`}>{b.series}</Link>
                        </li>
                    </ul>
                </div>
                <div class={styles.slider}>
                    <input
                        class={styles.range}
                        type='range'
                        value={props.page}
                        min={0}
                        max={props.pageCount - 1}
                        onChange={bindValue(props.changePage)}
                    />
                    <input
                        class={styles.number}
                        type='number'
                        value={props.page}
                        min={0}
                        max={props.pageCount - 1}
                        onChange={bindValue(props.changePage)}
                    />
                </div>
            </div>
        </div>
    )
}
