import { FunctionalComponent, h } from 'preact'
import { useBookCached } from 'src/caches'
import { route } from 'src/routes'
import { useOnline } from '../cache'
import { DBBook } from '../database'
import { useComputed } from '../hooks/computed'
import { usePageURL } from '../hooks/page'
import { post } from '../message'
import { EditBook } from './book-edit'
import { Card } from './card'
import { ContextMenuItems } from './context-menu'
import { openModal } from './modal'

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
