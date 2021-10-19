import { FunctionalComponent, h } from 'preact'
import { useCallback } from 'preact/hooks'
import { pageURL } from '../api'
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
        const EditBook: ModalComponent<undefined> = editProps => {
            const submit = useCallback(
                (data: Map<string, string>) => {
                    editProps.close(undefined)
                },
                [editProps.close],
            )
            return (
                <Modal>
                    <ModalHead>Edit Book</ModalHead>
                    <ModalBody>
                        <Form onSubmit={submit}>
                            <Input
                                title='Title'
                                name='title'
                                value={props.book.title}
                            />
                            <Input
                                title='Series'
                                name='series'
                                value={props.book.series}
                            />

                            <button type='submit'>Save</button>
                        </Form>
                    </ModalBody>
                </Modal>
            )
        }

        return [
            ['view', `/book/${props.book.id}`],
            ['view series', `/series/${props.book.series}`],
            ['edit', () => openModal('Edit book', EditBook)],
        ]
    }, [props.book.id, props.book.series])

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
