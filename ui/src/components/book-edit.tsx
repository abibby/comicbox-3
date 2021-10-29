import { h } from 'preact'
import { useCallback } from 'preact/hooks'
import { pageURL } from '../api'
import { persist } from '../cache'
import { DB } from '../database'
import { useNextBook, usePreviousBook } from '../hooks/book'
import { Book, Page, PageType } from '../models'
import { prompt } from './alert'
import { Data, Form } from './form/form'
import { Input } from './form/input'
import { Select } from './form/select'
import { Toggle } from './form/toggle'
import {
    Modal,
    ModalBody,
    ModalComponent,
    ModalFoot,
    ModalHead,
    openModal,
} from './modal'

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

export const EditBook: ModalComponent<undefined, EditBookProps> = ({
    book,
    close,
}) => {
    const previous = usePreviousBook(`edit:${book.id}:previous`, book)
    const next = useNextBook(`edit:${book.id}:next`, book)
    const submit = useCallback(
        async (data: Data) => {
            try {
                const b = book

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
                persist(true)
                close(undefined)

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
        [book, close, next, previous],
    )

    return (
        <Modal>
            <Form onSubmit={submit}>
                <ModalHead close={close}>Edit Book</ModalHead>
                <ModalBody>
                    <Input title='Series' name='series' value={book.series} />
                    <Input title='Title' name='title' value={book.title} />
                    <Input
                        title='Volume'
                        type='number'
                        name='volume'
                        value={book.volume ?? ''}
                    />
                    <Input
                        title='Chapter'
                        type='number'
                        name='chapter'
                        value={book.chapter ?? ''}
                    />
                    <Toggle title='Right to Left' name='rtl' value={book.rtl} />

                    {book.pages.map((p, i) => {
                        return (
                            <div>
                                <img src={pageURL(book, i)} height='200' />
                                <Select
                                    title='Type'
                                    name='page.type'
                                    options={pageTypeOptions}
                                    value={p.type}
                                />
                            </div>
                        )
                    })}
                </ModalBody>
                <ModalFoot>
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
                </ModalFoot>
            </Form>
        </Modal>
    )
}

function isPageType(s: string): s is PageType {
    return s in PageType
}
