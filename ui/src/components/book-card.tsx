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
        return [
            ['view', `/book/${props.book.id}`],
            ['view series', `/series/${props.book.series}`],
            [
                'edit',
                () =>
                    openModal('Edit book', EditBook, {
                        title: props.book.title,
                        series: props.book.series,
                    }),
            ],
        ]
    }, [props.book.id, props.book.title, props.book.series])

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
    title: string
    series: string
}

const EditBook: ModalComponent<undefined, EditBookProps> = props => {
    const submit = useCallback(
        (data: Map<string, string>) => {
            props.close(undefined)
        },
        [props.close],
    )
    return (
        <Modal>
            <ModalHead>Edit Book</ModalHead>
            <ModalBody>
                <Form onSubmit={submit}>
                    <Input title='Title' name='title' value={props.title} />
                    <Input title='Series' name='series' value={props.series} />

                    <button type='submit'>Save</button>
                </Form>
            </ModalBody>
        </Modal>
    )
}
