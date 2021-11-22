import { FunctionalComponent, h } from 'preact'
import { useCallback } from 'preact/hooks'
import { persist } from '../cache'
import { DB } from '../database'
import { useNextBook, usePreviousBook } from '../hooks/book'
import { usePageURL } from '../hooks/page'
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
import { Tab, TabContainer } from './tab'

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
                switch (data.get('tab')) {
                    case 'meta':
                        DB.saveBook(book, {
                            title: data.get('title') ?? '',
                            series: data.get('series') ?? '',
                            volume: data.getNumber('volume'),
                            chapter: data.getNumber('chapter'),
                            rtl: data.getBoolean('rtl') ?? false,
                        })
                        break
                    case 'pages':
                        DB.saveBook(book, {
                            pages: data.getAll('page.type')?.map(
                                (type): Page => ({
                                    url: '',
                                    type: isPageType(type)
                                        ? type
                                        : PageType.Story,
                                }),
                            ),
                        })
                        break
                }

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
                    <TabContainer>
                        <Tab title='meta'>
                            <input type='hidden' name='tab' value='meta' />
                            <Input
                                title='Series'
                                name='series'
                                value={book.series}
                            />
                            <Input
                                title='Title'
                                name='title'
                                value={book.title}
                            />
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
                            <Toggle
                                title='Right to Left'
                                name='rtl'
                                value={book.rtl}
                            />
                        </Tab>
                        <Tab title='pages'>
                            <input type='hidden' name='tab' value='pages' />
                            {book.pages.map(p => (
                                <PageThumb page={p} />
                            ))}
                        </Tab>
                    </TabContainer>
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

interface PageThumbProps {
    page: Page
}
const PageThumb: FunctionalComponent<PageThumbProps> = props => {
    const url = usePageURL(props.page)

    return (
        <div>
            <img src={url} height='200' />
            <Select
                title='Type'
                name='page.type'
                options={pageTypeOptions}
                value={props.page.type}
            />
        </div>
    )
}
