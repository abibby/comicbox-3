import { bind, bindValue } from '@zwzn/spicy'
import { FunctionalComponent, h, RefObject } from 'preact'
import { ChevronLeft, Edit } from 'preact-feather'
import { useCallback, useEffect, useMemo, useState } from 'preact/hooks'
import { useHasScope } from 'src/api/auth'
import classNames from 'src/classnames'
import { openModal } from 'src/components/modal-controller'
import styles from 'src/components/reading-overlay.module.css'
import { history } from 'src/history'
import { Book, Series } from 'src/models'
import { route } from 'src/routes'
import { bookFullName, translate } from 'src/services/book-service'
import { encode } from 'src/util'

interface OverlayProps {
    book: Book
    series: Series
    sourcePage: number
    baseRef: RefObject<HTMLDivElement>
    open: boolean
    landscape: boolean
    onPageChange: (page: number) => void | Promise<void>
}

export const Overlay: FunctionalComponent<OverlayProps> = props => {
    const book = props.book

    const bookWrite = useHasScope('book:write')
    const [displayPage, setDisplayPage] = useState(0)
    const sliderInput = useCallback((p: string) => {
        setDisplayPage(Number(p))
    }, [])

    const changePage = props.onPageChange
    const updateDisplayPage = useCallback(
        async (newDisplayPage: string) => {
            const newSourcePage = translate(book, Number(newDisplayPage))
                .from('displayPage')
                .to('sourcePage')

            if (newSourcePage === props.sourcePage) {
                return
            }

            await changePage(newSourcePage)
        },
        [book, changePage, props.sourcePage],
    )

    useEffect(() => {
        setDisplayPage(
            translate(book, props.sourcePage)
                .from('sourcePage')
                .to('displayPage'),
        )
    }, [book, props.sourcePage])

    const maxDisplayPage = translate(book, book.pages.length - 1)
        .from('sourcePage')
        .to('displayPage')

    const closeLink = useMemo(() => {
        for (let i = 0; i < history.length; i++) {
            const url = history.get(i)

            if (url && !/\/book\/.*/.test(url)) {
                return url
            }
        }
        return route('home')
    }, [])

    return (
        <div
            class={classNames(styles.overlay, {
                [styles.open]: props.open,
                [styles.rtl]: props.book.rtl,
            })}
            ref={props.baseRef}
        >
            <div class={styles.content}>
                <a class={styles.close} href={closeLink}>
                    <ChevronLeft />
                </a>
                <div class={styles.slider}>
                    <input
                        style={{
                            '--value': displayPage,
                            '--min': 1,
                            '--max': maxDisplayPage,
                        }}
                        class={styles.range}
                        type='range'
                        value={displayPage}
                        min={1}
                        max={maxDisplayPage}
                        onChange={bindValue(updateDisplayPage)}
                        onInput={bindValue(sliderInput)}
                    />
                    <div class={styles.title}>
                        <a
                            class={styles.series}
                            href={route('series.view', {
                                series: book.series_slug,
                            })}
                        >
                            {props.series?.name ?? book.series_slug}
                        </a>
                        <div class={styles.book}>{bookFullName(book)}</div>
                    </div>
                    <div class={styles.options}>
                        <div class={styles.pageNumber}>
                            {displayPage}{' '}
                            <span class={styles.pageCount}>
                                / {maxDisplayPage}
                            </span>
                        </div>
                        {bookWrite && (
                            <button
                                onClick={bind(
                                    encode`/book/${book.id}`,
                                    openModal,
                                )}
                            >
                                <Edit />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
