import { FunctionalComponent, h } from 'preact'
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

export const BookCard: FunctionalComponent<BookProps> = props => {
    const menu = useComputed<ContextMenuItems>(() => {
        return [
            ['view series', `/series/${props.book.series}`],
            [
                'edit',
                () =>
                    openModal(EditBook, {
                        book: props.book,
                    }),
            ],
            [
                'download',
                () =>
                    post({
                        type: 'download-book',
                        bookID: props.book.id,
                    }),
            ],
        ]
    }, [props.book])
    const online = useOnline()

    let title = ''
    if (props.book.volume) {
        title += 'V' + props.book.volume
    }
    if (props.book.chapter) {
        if (title !== '') {
            title += ' '
        }
        title += '#' + props.book.chapter
    }
    if (props.book.title) {
        if (title !== '') {
            title += ' • '
        }
        title += props.book.title
    }
    const coverURL = usePageURL(props.book)

    const currentPage = props.book.user_book?.current_page ?? 0
    const progress =
        currentPage !== 0 ? currentPage / (props.book.page_count - 1) : 0

    return (
        <Card
            image={coverURL}
            link={route('book.view', { id: props.book.id })}
            // link={`/book/${encodeURIComponent(props.book.id)}`}
            title={props.book.series}
            subtitle={title}
            menu={menu}
            disabled={!online && !props.book.downloaded}
            progress={progress}
        />
    )
}
