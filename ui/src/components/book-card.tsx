import { FunctionalComponent, h } from 'preact'
import { useCallback } from 'preact/hooks'
import { pageURL } from '../api'
import { DB } from '../database'
import { useNextBook, usePreviousBook } from '../hooks/book'
import { useComputed } from '../hooks/computed'
import { Book, Page } from '../models'
import { Card } from './card'
import { ContextMenuItems } from './context-menu'
import { Data, Form } from './form/form'
import { Input } from './form/input'
import { Select } from './form/select'
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
const pageTypeOptions: [Page['type'], string][] = [
    ['FrontCover', 'Cover'],
    ['Story', 'Story'],
    ['Spread', 'Spread'],
    ['SpreadSplit', 'Split Spread'],
    ['Deleted', 'Deleted'],
]
type EditBookProps = {
    book: Book
}

const EditBook: ModalComponent<undefined, EditBookProps> = props => {
    const previous = usePreviousBook(
        `edit:${props.book.id}:previous`,
        props.book,
    )
    const next = useNextBook(`edit:${props.book.id}:next`, props.book)
    const submit = useCallback(
        async (data: Data) => {
            const b = props.book

            b.title = data.get('title') ?? ''
            b.series = data.get('series') ?? ''
            b.volume = data.getNumber('volume')
            b.chapter = data.getNumber('chapter')

            b.pages =
                data.getAll('page.type')?.map(type => {
                    return {
                        url: '',
                        type: type,
                    }
                }) ?? b.pages

            DB.books.put(b)
            DB.persist(true)
            props.close(undefined)

            switch (data.get('submit')) {
                case 'next':
                    if (next) {
                        openModal(EditBook, { book: next })
                    }
                    break
                case 'previous':
                    if (previous) {
                        openModal(EditBook, { book: previous })
                    }
                    break
            }
        },
        [props.close, next, previous],
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

                    {props.book.pages.map((p, i) => {
                        return (
                            <div>
                                <img
                                    src={pageURL(props.book, i)}
                                    height='200'
                                />
                                <Select
                                    title='Type'
                                    name='page.type'
                                    options={pageTypeOptions}
                                    value={p.type}
                                />
                            </div>
                        )
                    })}

                    <button type='submit'>Save</button>
                    <button
                        type='submit'
                        name='submit'
                        value='next'
                        disabled={previous === undefined}
                    >
                        Previous
                    </button>
                    <button
                        type='submit'
                        name='submit'
                        value='next'
                        disabled={next === undefined}
                    >
                        Next
                    </button>
                </Form>
            </ModalBody>
        </Modal>
    )
}
