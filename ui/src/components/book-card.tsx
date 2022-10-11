import { FunctionalComponent, h } from 'preact'
import { useOnline } from 'src/cache'
import { useBookCached } from 'src/caches'
import { EditBook } from 'src/components/book-edit'
import { Card } from 'src/components/card'
import { ContextMenuItems } from 'src/components/context-menu'
import { openModal } from 'src/components/modal'
import { DBBook } from 'src/database'
import { useComputed } from 'src/hooks/computed'
import { usePageURL } from 'src/hooks/page'
import { post } from 'src/message'
import { route } from 'src/routes'

interface BookProps {
    book: DBBook
}

export const BookCard: FunctionalComponent<BookProps> = ({ book }) => {
    const menu = useComputed<ContextMenuItems>(() => {
        return [
            ['view series', route('series.view', { series: book.series })],
            [
                'edit',
                () =>
                    openModal(EditBook, {
                        book: book,
                    }),
            ],
            [
                'download',
                () =>
                    post({
                        type: 'download-book',
                        bookID: book.id,
                    }),
            ],
        ]
    }, [book])
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

    const [downloaded, downloadProgress] = useBookCached(book.id)

    return (
        <Card
            image={coverURL}
            link={route('book.view', { id: book.id })}
            // link={`/book/${encodeURIComponent(book.id)}`}
            title={book.series}
            subtitle={title}
            menu={menu}
            disabled={!online && !downloaded}
            progress={progress}
            downloaded={downloaded}
            downloadProgress={downloadProgress}
        />
    )
}
