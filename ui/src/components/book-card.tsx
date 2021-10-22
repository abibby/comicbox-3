import { FunctionalComponent, h } from 'preact'
import { useCallback } from 'preact/hooks'
import { pageURL } from '../api'
import { DB } from '../database'
import { useComputed } from '../hooks/computed'
import { Book } from '../models'
import { Card } from './card'
import { ContextMenuItems } from './context-menu'
import { Form } from './form/form'
import { Input } from './form/input'
import { Modal, ModalBody, ModalComponent, ModalHead, openModal } from './modal'

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
                    openModal('Edit book', EditBook, {
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

type EditBookProps = {
    book: Book
}

const EditBook: ModalComponent<undefined, EditBookProps> = props => {
    const submit = useCallback(
        async (data: Map<string, string>) => {
            const b = props.book

            b.title = data.get('title') ?? ''
            b.series = data.get('series') ?? ''
            b.volume = numberOrNull(data.get('volume'))
            b.chapter = numberOrNull(data.get('chapter'))

            DB.books.put(b)
            DB.persist(true)
            props.close(undefined)
        },
        [props.close],
    )
    return (
        <Modal>
            <ModalHead>Edit Book</ModalHead>
            <ModalBody>
                <Form onSubmit={submit}>
                    <Input
                        title='Series'
                        name='series'
                        value={props.book.series}
                    />
                    <Input
                        title='Title'
                        name='title'
                        value={props.book.title}
                    />
                    <Input
                        title='Volume'
                        type='number'
                        name='volume'
                        value={props.book.volume ?? ''}
                    />
                    <Input
                        title='Chapter'
                        type='number'
                        name='chapter'
                        value={props.book.chapter ?? ''}
                    />

                    <button type='submit'>Save</button>
                </Form>
            </ModalBody>
        </Modal>
    )
}

function numberOrNull(value: string | undefined): number | null {
    if (value === undefined || value === '') {
        return null
    }
    return Number(value)
}
