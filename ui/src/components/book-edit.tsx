import { h } from 'preact'
import { useCallback } from 'preact/hooks'
import { pageURL } from '../api'
import { DB } from '../database'
import { useNextBook, usePreviousBook } from '../hooks/book'
import { Book, Page, PageType } from '../models'
import { Data, Form } from './form/form'
import { Input } from './form/input'
import { Select } from './form/select'
import { Toggle } from './form/toggle'
import { Modal, ModalBody, ModalComponent, ModalHead, openModal } from './modal'

const pageTypeOptions: [PageType, string][] = [
    [PageType.FrontCover, 'Cover'],
    [PageType.Story, 'Story'],
    [PageType.Spread, 'Spread'],
    [PageType.SpreadSplit, 'Split Spread'],
    [PageType.Deleted, 'Deleted'],
]
type EditBookProps = {
    book: Book
}

export const EditBook: ModalComponent<undefined, EditBookProps> = props => {
    const previous = usePreviousBook(
        `edit:${props.book.id}:previous`,
        props.book,
    )
    const next = useNextBook(`edit:${props.book.id}:next`, props.book)
    const submit = useCallback(
        async (data: Data) => {
            try {
                const b = props.book

                b.title = data.get('title') ?? ''
                b.series = data.get('series') ?? ''
                b.volume = data.getNumber('volume')
                b.chapter = data.getNumber('chapter')
                b.rtl = data.getBoolean('rtl')

                b.pages =
                    data.getAll('page.type')?.map((type): Page => {
                        if (!isPageType(type)) {
                            throw new Error(`Invalid page type ${type}`)
                        }
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
            } catch (e) {
                if (e instanceof Error) {
                    prompt(e.message)
                }
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
                    <Toggle
                        title='Right to Left'
                        name='rtl'
                        value={props.book.rtl}
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

function isPageType(s: string): s is PageType {
    return s in PageType
}
