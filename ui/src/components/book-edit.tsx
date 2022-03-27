import { FunctionalComponent, h } from 'preact'
import { useCallback } from 'preact/hooks'
import { persist } from '../cache'
import { DB } from '../database'
import { useNextBook, usePreviousBook } from '../hooks/book'
import { usePageURL } from '../hooks/page'
import { Book, Page, PageType } from '../models'
import { prompt } from './alert'
import styles from './book-edit.module.css'
import { Button, ButtonGroup } from './button'
import { Data, Form } from './form/form'
import { Input } from './form/input'
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
                                (type, i): Page => ({
                                    url: book.pages[i]?.url ?? '',
                                    type: isPageType(type)
                                        ? type
                                        : PageType.Story,
                                }),
                            ),
                        })
                        break
                }

                persist(true)
                prompt('Chapter updated', {})

                switch (data.get('submit')) {
                    case 'next':
                        if (next) {
                            close(undefined)
                            openModal(EditBook, { book: next })
                        }
                        break
                    case 'previous':
                        if (previous) {
                            close(undefined)
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
                                step='any'
                            />
                            <Toggle
                                title='Right to Left'
                                name='rtl'
                                value={book.rtl}
                            />
                        </Tab>
                        <Tab title='pages'>
                            <input type='hidden' name='tab' value='pages' />
                            <div class={styles.pageList}>
                                {book.pages.map(p => (
                                    <PageThumb key={p.url} page={p} />
                                ))}
                            </div>
                        </Tab>
                    </TabContainer>
                </ModalBody>
                <ModalFoot>
                    <ButtonGroup>
                        <Button type='submit' color='primary'>
                            Save
                        </Button>
                        <Button
                            type='submit'
                            name='submit'
                            value='next'
                            disabled={previous === undefined}
                        >
                            Previous
                        </Button>
                        <Button
                            type='submit'
                            name='submit'
                            value='next'
                            disabled={next === undefined}
                        >
                            Next
                        </Button>
                    </ButtonGroup>
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
        <div class={styles.page}>
            <label>
                <img src={url} height='200' />
                <select
                    class={styles.pageTypeSelect}
                    name='page.type'
                    value={props.page.type}
                >
                    {pageTypeOptions.map(([value, title]) => (
                        <option key={value} value={value}>
                            {title}
                        </option>
                    ))}
                </select>
            </label>
        </div>
    )
}
