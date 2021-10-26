import { FunctionalComponent, h } from 'preact'
import { pageURL } from '../api'
import { useComputed } from '../hooks/computed'
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
        ]
    }, [props.book.id, props.book.series, props.book])

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
    return (
        <Card
            image={pageURL(props.book)}
            link={`/book/${props.book.id}`}
            title={props.book.series}
            subtitle={title}
            menu={menu}
        />
    )
}
