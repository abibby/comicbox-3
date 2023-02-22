import { bind, bindValue } from '@zwzn/spicy'
import classNames from 'classnames'
import { FunctionalComponent, h } from 'preact'
import { useCallback, useState } from 'preact/hooks'
import { persist } from 'src/cache'
import { prompt } from 'src/components/alert'
import styles from 'src/components/book-edit.module.css'
import { Button, ButtonGroup } from 'src/components/button'
import { Data, Form } from 'src/components/form/form'
import { Input } from 'src/components/form/input'
import { Toggle } from 'src/components/form/toggle'
import {
    Modal,
    ModalBody,
    ModalComponent,
    ModalFoot,
    ModalHead,
    openModal,
} from 'src/components/modal'
import { Tab, TabContainer } from 'src/components/tab'
import { DB } from 'src/database'
import { useNextBook, usePreviousBook } from 'src/hooks/book'
import { usePageURL } from 'src/hooks/page'
import { Book, Page, PageType } from 'src/models'
import { PageWithIndex, splitPages } from 'src/services/book-service'
import { LazyImg } from './lazy-img'

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
                        await DB.saveBook(book, {
                            title: data.get('title') ?? '',
                            series: data.get('series') ?? '',
                            volume: data.getNumber('volume'),
                            chapter: data.getNumber('chapter'),
                            rtl: data.getBoolean('rtl') ?? false,
                        })
                        break
                    case 'pages':
                        if (
                            book.pages.length !==
                            data.getAll('page.type')?.length
                        ) {
                            prompt('Invalid page count')
                            return
                        }
                        await DB.saveBook(book, {
                            pages: data.getAll('page.type')?.map(
                                (type, i): Page => ({
                                    url: book.pages[i]?.url ?? '',
                                    thumbnail_url:
                                        book.pages[i]?.thumbnail_url ?? '',
                                    type: isPageType(type)
                                        ? type
                                        : PageType.Story,
                                }),
                            ),
                        })
                        break
                }

                await persist(true)
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

    const [editedPages, setEditedPages] = useState(book.pages)

    const changePageType = useCallback(
        (page: number, type: string) => {
            setEditedPages(pages =>
                pages.map((p, i) => {
                    if (i === page && isPageType(type)) {
                        return {
                            ...p,
                            type: type,
                        }
                    }
                    return p
                }),
            )
        },
        [setEditedPages],
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
                            <Input
                                title='File'
                                name='file'
                                readonly
                                value={book.file}
                            />
                        </Tab>
                        <Tab title='pages'>
                            <input type='hidden' name='tab' value='pages' />
                            <div
                                class={classNames(styles.pageList, {
                                    [styles.rtl]: book.rtl,
                                })}
                            >
                                {splitPages(editedPages, true, true).map(p => (
                                    <SpreadThumb
                                        key={p[0].url}
                                        page={p}
                                        onPageTypeChange={changePageType}
                                    />
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

interface SpreadThumbProps {
    page: [PageWithIndex] | [PageWithIndex, PageWithIndex]
    onPageTypeChange: (page: number, type: string) => void
}
const SpreadThumb: FunctionalComponent<SpreadThumbProps> = props => {
    return (
        <div class={styles.spread}>
            {props.page.map(p => (
                <PageThumb
                    key={p.url}
                    page={p}
                    onPageTypeChange={props.onPageTypeChange}
                />
            ))}
        </div>
    )
}

interface PageThumbProps {
    page: PageWithIndex
    onPageTypeChange: (page: number, type: string) => void
}
const PageThumb: FunctionalComponent<PageThumbProps> = props => {
    const url = usePageURL(props.page, undefined, true)

    return (
        <div class={styles.page}>
            <label>
                <LazyImg src={url} />
                <span class={styles.index}>{props.page.index + 1}</span>
                <select
                    class={styles.pageTypeSelect}
                    name='page.type'
                    value={props.page.type}
                    onInput={bindValue(
                        bind(props.page.index, props.onPageTypeChange),
                    )}
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
