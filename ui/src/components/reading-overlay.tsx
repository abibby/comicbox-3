import { bindValue } from '@zwzn/spicy'
import { FunctionalComponent, h, RefObject } from 'preact'
import { Link } from 'preact-router'
import { useCallback, useEffect, useState } from 'preact/hooks'
import classNames from 'src/classnames'
import { EditBook } from 'src/components/book-edit'
import { openModal } from 'src/components/modal'
import styles from 'src/components/reading-overlay.module.css'
import { Book } from 'src/models'
import { route } from 'src/routes'
import { translate } from 'src/services/book-service'

interface OverlayProps {
    book: Book
    sourcePage: number
    baseRef: RefObject<HTMLDivElement>
    open: boolean
    landscape: boolean
    onPageChange: (page: number) => void | Promise<void>
}

export const Overlay: FunctionalComponent<OverlayProps> = props => {
    const b = props.book
    const edit = useCallback(async () => {
        await openModal(EditBook, { book: b })
    }, [b])

    const [displayPage, setDisplayPage] = useState(0)
    const sliderInput = useCallback((p: string) => {
        setDisplayPage(Number(p))
    }, [])

    const changePage = props.onPageChange
    const updateDisplayPage = useCallback(
        async (newDisplayPage: string) => {
            const newSourcePage = translate(b, Number(newDisplayPage))
                .from('displayPage')
                .to('sourcePage')

            if (newSourcePage === props.sourcePage) {
                return
            }

            await changePage(newSourcePage)
        },
        [b, changePage, props.sourcePage],
    )

    useEffect(() => {
        setDisplayPage(
            translate(b, props.sourcePage).from('sourcePage').to('displayPage'),
        )
    }, [b, props.sourcePage])

    const maxDisplayPage = translate(b, b.pages.length - 1)
        .from('sourcePage')
        .to('displayPage')

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
                        value={displayPage}
                        min={0}
                        max={maxDisplayPage}
                        onChange={bindValue(updateDisplayPage)}
                        onInput={bindValue(sliderInput)}
                    />
                    <input
                        class={styles.number}
                        type='number'
                        value={displayPage}
                        min={0}
                        max={maxDisplayPage}
                        onChange={bindValue(updateDisplayPage)}
                    />
                </div>
            </div>
        </div>
    )
}
