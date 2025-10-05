import { FunctionalComponent, h } from 'preact'
import { deleteBook, persist, useOnline } from 'src/cache'
import { removeBookCache, useBookCached } from 'src/caches'
import { openToast } from 'src/components/toast'
import { Card } from 'src/components/card'
import { ContextMenuItem } from 'src/components/context-menu'
import { DB, DBBook, DBSeries } from 'src/database'
import { usePageURL } from 'src/hooks/page'
import { route } from 'src/routes'
import { openModal } from 'src/components/modal-controller'
import { useMemo } from 'preact/hooks'
import { encode } from 'src/util'
import {
    bookFullName,
    downloadBook,
    translate,
} from 'src/services/book-service'
import { useHasScope } from 'src/api/auth'

interface BookProps {
    book: DBBook
    series?: DBSeries
    scrollIntoView?: boolean | ScrollIntoViewOptions
}

export const BookCard: FunctionalComponent<BookProps> = ({
    book,
    series,
    scrollIntoView,
}) => {
    const [downloaded, downloadProgress] = useBookCached(book)
    const bookWrite = useHasScope('book:write')
    const bookDelete = useHasScope('book:delete')
    const admin = useHasScope('admin')
    const menu = useMemo((): ContextMenuItem[] => {
        const currentPage = book.user_book?.current_page ?? 0
        return [
            {
                label: 'View series',
                action: route('series.view', { series: book.series_slug }),
            },
            {
                label: 'Edit',
                action: () => openModal(encode`/book/${book.id}/meta`),
                active: bookWrite,
            },
            {
                label: 'Mark as read',
                action: async () => {
                    await DB.saveBook(book, {
                        user_book: {
                            current_page: book.page_count - 1,
                        },
                    })
                    await persist(true)
                },
                active: currentPage < book.page_count - 1,
            },
            {
                label: 'Mark as unread',
                action: async () => {
                    await DB.saveBook(book, {
                        user_book: {
                            current_page: 0,
                        },
                    })
                    await persist(true)
                },
                active: currentPage > 0,
            },
            {
                label: 'Download',
                action: () => downloadBook(book),
                active: !downloaded,
            },
            {
                label: 'Remove',
                action: () => removeBookCache(book.id),
                active: downloaded,
            },
            {
                label: 'Delete',
                action: () => deleteBook(book),
                active: bookDelete,
            },
            {
                label: 'Delete file',
                action: async () => {
                    const shouldDelete = await openToast(
                        `Are you sure you want to delete ${book.file}?`,
                        {
                            No: false,
                            Yes: true,
                        },
                        -1,
                    )
                    if (shouldDelete) {
                        await deleteBook(book, true)
                    }
                },
                active: admin,
            },
        ]
    }, [admin, book, bookDelete, bookWrite, downloaded])
    const online = useOnline()

    const coverURL = usePageURL(book)
    const currentPage = translate(book, book.user_book?.current_page ?? 0)
        .from('sourcePage')
        .to('activePage')
    const pageCount = translate(book, book.page_count)
        .from('sourcePage')
        .to('activePage')
    const progress = currentPage !== 0 ? currentPage / (pageCount - 1) : 0
    const s = series ?? book.series
    return (
        <Card
            image={coverURL}
            link={route('book.view', { id: book.id })}
            title={s?.name ?? book.series_slug}
            subtitle={bookFullName(book)}
            menu={menu}
            disabled={!online && !downloaded}
            progress={progress}
            downloaded={downloaded}
            downloadProgress={downloadProgress}
            scrollIntoView={scrollIntoView}
        />
    )
}
