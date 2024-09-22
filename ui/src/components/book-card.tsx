import { FunctionalComponent, h } from 'preact'
import { deleteBook, persist, useOnline } from 'src/cache'
import { removeBookCache, useBookCached } from 'src/caches'
import { openToast } from 'src/components/toast'
import { Card } from 'src/components/card'
import { ContextMenuItems } from 'src/components/context-menu'
import { DB, DBBook } from 'src/database'
import { usePageURL } from 'src/hooks/page'
import { post } from 'src/message'
import { route } from 'src/routes'
import { openModal } from 'src/components/modal-controller'
import { useMemo } from 'preact/hooks'
import { encode } from 'src/util'

interface BookProps {
    book: DBBook
    scrollIntoView?: boolean | ScrollIntoViewOptions
}

export const BookCard: FunctionalComponent<BookProps> = ({
    book,
    scrollIntoView,
}) => {
    const [downloaded, downloadProgress] = useBookCached(book)
    const menu = useMemo((): ContextMenuItems => {
        const currentPage = book.user_book?.current_page ?? 0
        return [
            ['View series', route('series.view', { series: book.series })],
            ['Edit', () => openModal(encode`/book/${book.id}/meta`)],
            currentPage < book.page_count - 1 && [
                'Mark as read',
                async () => {
                    await DB.saveBook(book, {
                        user_book: {
                            current_page: book.page_count - 1,
                        },
                    })
                    await persist(true)
                },
            ],
            currentPage > 0 && [
                'Mark as unread',
                async () => {
                    await DB.saveBook(book, {
                        user_book: {
                            current_page: 0,
                        },
                    })
                    await persist(true)
                },
            ],
            !downloaded && [
                'Download',
                () =>
                    post({
                        type: 'download-book',
                        bookID: book.id,
                    }),
            ],
            downloaded && ['Remove', () => removeBookCache(book.id)],
            ['Delete', () => deleteBook(book)],
            [
                'Delete file',
                async () => {
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
            ],
        ]
    }, [book, downloaded])
    const online = useOnline()

    let title = ''
    if (book.volume) {
        title += 'V' + book.volume
    }
    if (book.chapter) {
        if (title !== '') {
            title += ' '
        }
        title += '#' + book.chapter
    }
    if (book.title) {
        if (title !== '') {
            title += ' • '
        }
        title += book.title
    }
    const coverURL = usePageURL(book)

    const currentPage = book.user_book?.current_page ?? 0
    const progress = currentPage !== 0 ? currentPage / (book.page_count - 1) : 0

    return (
        <Card
            image={coverURL}
            link={route('book.view', { id: book.id })}
            title={book.series}
            subtitle={title}
            menu={menu}
            disabled={!online && !downloaded}
            progress={progress}
            downloaded={downloaded}
            downloadProgress={downloadProgress}
            scrollIntoView={scrollIntoView}
        />
    )
}
