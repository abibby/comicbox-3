import { FunctionalComponent, h } from 'preact'
import { useComputed } from '../hooks/computed'
import { usePageURL } from '../hooks/page'
import { post } from '../message'
import { Book } from '../models'
import { EditBook } from './book-edit'
import { Card } from './card'
import { ContextMenuItems } from './context-menu'
import { openModal } from './modal'

interface BookProps {
    book: Book
}

export const BookCard: FunctionalComponent<BookProps> = props => {
    const menu = useComputed<ContextMenuItems>(() => {
        return [
            ['view', `/book/${props.book.id}`],
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
    return (
        <Card
            image={coverURL}
            link={`/book/${props.book.id}`}
            title={props.book.series}
            subtitle={title}
            menu={menu}
        />
    )
}
