import { bind, bindValue } from '@zwzn/spicy'
import { FunctionalComponent, h, RefObject } from 'preact'
import { useCallback, useEffect, useState } from 'preact/hooks'
import classNames from 'src/classnames'
import styles from 'src/components/reading-overlay.module.css'
import { Book } from 'src/models'
import { route } from 'src/routes'
import { translate } from 'src/services/book-service'
import { openModal } from 'src/components/modal-controller'

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
                            <a onClick={bind(`/book/${b.id}`, openModal)}>
                                Edit
                            </a>
                        </li>
                        <li>
                            <a
                                href={route('series.view', {
                                    series: b.series,
                                })}
                            >
                                {b.series}
                            </a>
                        </li>
                    </ul>
                </div>
                <div class={styles.slider}>
                    <input
                        style={{
                            '--value': displayPage,
                            '--max': maxDisplayPage,
                        }}
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
