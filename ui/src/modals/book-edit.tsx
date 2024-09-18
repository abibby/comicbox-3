import { bind, bindValue } from '@zwzn/spicy'
import classNames from 'classnames'
import { FunctionalComponent, h } from 'preact'
import { useCallback, useEffect, useState } from 'preact/hooks'
import { persist } from 'src/cache'
import { openToast } from 'src/components/toast'
import styles from 'src/modals/book-edit.module.css'
import { Button, ButtonGroup } from 'src/components/button'
import { Data, Form } from 'src/components/form/form'
import { Input } from 'src/components/form/input'
import { LazyImg } from 'src/components/lazy-img'
import { Modal, ModalBody, ModalFoot, ModalHead } from 'src/components/modal'
import { Tab, TabContainer } from 'src/components/tab'
import { DB } from 'src/database'
import { useBook, useNextBook, usePreviousBook } from 'src/hooks/book'
import { usePageURL } from 'src/hooks/page'
import { Page, PageType } from 'src/models'
import { PageWithIndex, mergePages } from 'src/services/book-service'
import { Select } from 'src/components/form/select'
import { useModal, openModal } from 'src/components/modal-controller'
import { useRoute } from 'preact-iso'
import { encode } from 'src/util'

const pageTypeOptions: [PageType, string][] = [
    [PageType.FrontCover, 'Cover'],
    [PageType.Story, 'Story'],
    [PageType.Spread, 'Spread'],
    [PageType.SpreadSplit, 'Split Spread'],
    [PageType.Deleted, 'Deleted'],
]

const viewOptions = [
    ['ltr', 'Left to Right →'],
    ['rtl', 'Right to Left ←'],
    ['long_strip_ltr', 'Long Strip ↓'],
    ['long_strip_rtl', 'Long Strip, Right to Left ↓ ←'],
] as const

export const EditBook: FunctionalComponent = () => {
    const { params } = useRoute()
    const id = params.book

    const [book] = useBook(id ?? '')

    const { close } = useModal()
    const previous = usePreviousBook(book)
    const next = useNextBook(book)
    const submit = useCallback(
        async (data: Data) => {
            if (!book) {
                return
            }
            try {
                switch (data.get('tab')) {
                    case 'meta':
                        await DB.saveBook(book, {
                            title: data.get('title') ?? '',
                            series: data.get('series') ?? '',
                            volume: data.getNumber('volume'),
                            chapter: data.getNumber('chapter'),
                            rtl: data.get('view')?.endsWith('rtl') ?? false,
                            long_strip:
                                data.get('view')?.startsWith('long_strip') ??
                                false,
                        })
                        break
                    case 'pages':
                        if (
                            book.pages.length !==
                            data.getAll('page.type')?.length
                        ) {
                            await openToast('Invalid page count')
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
                                    width: book.pages[i]?.height ?? 0,
                                    height: book.pages[i]?.width ?? 0,
                                }),
                            ),
                        })
                        break
                }

                void openToast(
                    'Chapter updating',
                    {},
                    5000,
                    `chapter-save-${book.id}`,
                )
                void persist(true).then(() =>
                    openToast(
                        'Chapter updated',
                        {},
                        5000,
                        `chapter-save-${book.id}`,
                    ),
                )

                switch (data.get('submit')) {
                    case 'next':
                        if (next) {
                            close()
                            openModal(encode`/book/${next.id}`)
                        }
                        break
                    case 'previous':
                        if (previous) {
                            close()
                            openModal(encode`/book/${previous.id}`)
                        }
                        break
                }
            } catch (e) {
                if (e instanceof Error) {
                    void openToast(e.message)
                }
            }
        },
        [book, close, next, previous],
    )

    const [editedPages, setEditedPages] = useState(book?.pages ?? [])
    useEffect(() => {
        setEditedPages(book?.pages ?? [])
    }, [book?.pages])

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

    if (!book) {
        return (
            <Modal>
                <ModalHead>Edit Book</ModalHead>
                <ModalBody>Loading</ModalBody>
            </Modal>
        )
    }

    let view = book.rtl ? 'rtl' : 'ltr'
    if (book.long_strip) {
        view = 'long_strip_' + view
    }

    return (
        <Modal>
            <Form onSubmit={submit}>
                <ModalHead>Edit Book</ModalHead>
                <ModalBody>
                    <TabContainer class={styles.tabs}>
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
                            <Select
                                title='View'
                                name='view'
                                options={viewOptions}
                                value={view}
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
                                    [styles.longStrip]: book.long_strip,
                                })}
                            >
                                {mergePages(
                                    editedPages,
                                    book.long_strip,
                                    true,
                                    true,
                                ).map(p => (
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
                            value='previous'
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
    const url = usePageURL(props.page, undefined, { thumbnail: true })

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
