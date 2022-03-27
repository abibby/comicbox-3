import { bindValue } from '@zwzn/spicy'
import { FunctionalComponent, h, RefObject } from 'preact'
import { Link } from 'preact-router'
import { useCallback, useState } from 'preact/hooks'
import classNames from 'src/classnames'
import { Book } from 'src/models'
import { route } from 'src/routes'
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

    const [page, setPage] = useState<number | null>(null)
    const sliderInput = useCallback((p: string) => {
        setPage(Number(p))
    }, [])
    const changePage = props.changePage
    const sliderChange = useCallback(
        (p: string) => {
            setPage(null)
            changePage(p)
        },
        [changePage],
    )

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
                            <Link
                                href={route('series.view', {
                                    series: b.series,
                                })}
                            >
                                {b.series}
                            </Link>
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
                        onChange={bindValue(sliderChange)}
                        onInput={bindValue(sliderInput)}
                    />
                    <input
                        class={styles.number}
                        type='number'
                        value={page ?? props.page}
                        min={0}
                        max={props.pageCount - 1}
                        onChange={bindValue(props.changePage)}
                    />
                </div>
            </div>
        </div>
    )
}
