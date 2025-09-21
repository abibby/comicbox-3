import { useMemo } from 'preact/hooks'
import { backgroundFetch, backgroundFetchEnabled } from 'src/background-fetch'
import { sendCacheUpdate } from 'src/caches'
import { Book, Page, PageType, Series } from 'src/models'
import icon from 'res/images/logo.svg'
import { pageURL } from 'src/api'
import { post } from 'src/message'

export interface PageWithIndex extends Page {
    index: number
}

export type MergedPages = Array<
    [PageWithIndex] | [PageWithIndex, PageWithIndex]
>

export function mergePages(
    p: Page[],
    longStrip: boolean,
    twoPage: boolean,
    withDeleted = false,
): MergedPages {
    if (!withDeleted) {
        p = p.filter(p => p.type !== PageType.Deleted)
    }
    const pages: Array<[PageWithIndex] | [PageWithIndex, PageWithIndex]> = []

    for (let i = 0; i < p.length; i++) {
        const page = p[i]
        const nextPage = p[i + 1]

        if (page === undefined) {
            continue
        }
        if (!longStrip && nextPage && showTwoPages(twoPage, page, nextPage)) {
            pages.push([
                {
                    ...page,
                    index: i,
                },
                {
                    ...nextPage,
                    index: i + 1,
                },
            ])
            i++
        } else {
            pages.push([
                {
                    ...page,
                    index: i,
                },
            ])
        }
    }
    return pages
}

export function useMergedPages(
    pages: Page[],
    longStrip: boolean,
    twoPage: boolean,
    withDeleted = false,
): MergedPages {
    return useMemo(() => {
        return mergePages(pages, longStrip, twoPage, withDeleted)
    }, [pages, longStrip, twoPage, withDeleted])
}

function showTwoPages(
    towPage: boolean,
    currentPage: Page,
    nextPage: Page,
): boolean {
    if (
        currentPage.type === PageType.SpreadSplit &&
        nextPage.type === PageType.SpreadSplit
    ) {
        return true
    }
    if (
        towPage &&
        currentPage.type === PageType.Story &&
        nextPage.type === PageType.Story
    ) {
        return true
    }
    return false
}

// sourcePage the image number in the cbz
// activePage the image number in the cbz with deleted pages removed
// mergedPage the number of pages or spreads the user has passed, different in portrait and landscape
// displayPage the page of the book to show to the user, spreads are 2 pages

type PageNumberType = 'sourcePage' | 'activePage' | 'mergedPage' | 'displayPage'

export class PageFrom {
    constructor(private readonly book: Book, private readonly page: number) {}

    public from(from: PageNumberType): PageTo {
        return new PageTo(this.book, this.toSource(from))
    }

    public fromMerged(pages: Array<[Page] | [Page, Page]>) {
        return new PageTo(this.book, this.sourceFromMerged(this.page, pages))
    }

    private toSource(type: PageNumberType): number {
        switch (type) {
            case 'sourcePage':
                return this.page
            case 'activePage':
                return this.sourceFromActive(this.page)
            case 'mergedPage':
                return this.sourceFromMerged(this.page)
            case 'displayPage':
                return this.sourceFromDisplay(this.page)
        }
    }

    private sourceFromActive(activePage: number): number {
        const p = this.book.pages.filter(p => p.type !== 'Deleted')[activePage]
        if (p === undefined) {
            return -1
        }
        let currentPage = this.book.pages.indexOf(p)
        for (
            let i = Math.min(currentPage + 1, this.book.pages.length);
            i < this.book.pages.length;
            i++
        ) {
            if (this.book.pages[i]?.type === 'Deleted') {
                currentPage = i
            } else {
                break
            }
        }
        return currentPage
    }

    private sourceFromMerged(
        mergedPage: number,
        pages?: Array<[Page] | [Page, Page]>,
    ): number {
        if (!pages) {
            const landscape = window.matchMedia(
                '(orientation: landscape)',
            ).matches
            pages = mergePages(this.book.pages, this.book.long_strip, landscape)
        }
        const activePage = pages.slice(0, mergedPage + 1).flat().length - 1

        return this.sourceFromActive(activePage)
    }

    private sourceFromDisplay(displayPage: number) {
        let currentDisplay = 0
        for (let i = 0; i < this.book.pages.length; i++) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const page = this.book.pages[i]!
            switch (page.type) {
                case PageType.Deleted:
                    break
                case PageType.Spread:
                    currentDisplay += 2
                    break
                default:
                    currentDisplay++
            }

            if (currentDisplay >= displayPage) {
                return i
            }
        }
        return this.book.pages.length - 1
    }
}
export class PageTo {
    constructor(
        private readonly book: Book,
        private readonly sourcePage: number,
    ) {}

    public to(to: PageNumberType): number {
        switch (to) {
            case 'sourcePage':
                return this.sourcePage
            case 'activePage':
                return this.sourceToActive(this.sourcePage)
            case 'mergedPage':
                return this.sourceToMerged(this.sourcePage)
            case 'displayPage':
                return this.sourceToDisplay(this.sourcePage)
        }
    }
    public toMerged(pages: Array<[Page] | [Page, Page]>) {
        return this.sourceToMerged(this.sourcePage, pages)
    }

    private sourceToActive(sourcePage: number): number {
        let out = -1
        for (let i = 0; i < sourcePage + 1; i++) {
            if (this.book.pages[i]?.type !== 'Deleted') {
                out++
            }
        }
        return out
    }

    private sourceToMerged(
        sourcePage: number,
        pages?: Array<[Page] | [Page, Page]>,
    ): number {
        if (!pages) {
            const landscape = window.matchMedia(
                '(orientation: landscape)',
            ).matches
            pages = mergePages(this.book.pages, this.book.long_strip, landscape)
        }

        const activePage = this.sourceToActive(sourcePage)

        let current = 0
        for (const [i, p] of pages.entries()) {
            current += p.length
            if (current > activePage) {
                return i
            }
        }
        return -1
    }

    private sourceToDisplay(sourcePage: number): number {
        let i = 0
        for (const page of this.book.pages.slice(0, sourcePage + 1)) {
            switch (page.type) {
                case PageType.Deleted:
                    break
                case PageType.Spread:
                    i += 2
                    break
                default:
                    i++
            }
        }
        return i
    }
}

export function translate(b: Book, page: number): PageFrom {
    return new PageFrom(b, page)
}

export function bookFullName(book: Book): string {
    let title = ''
    if (book.volume) {
        title += 'V' + book.volume
    }
    if (book.chapter) {
        if (title !== '') {
            title += ' '
        }
        title += '#' + book.chapter
    }
    if (book.title) {
        if (title !== '') {
            title += ' • '
        }
        title += book.title
    }

    return title
}

export async function downloadBook(book: Book, series?: Series): Promise<void> {
    if (!backgroundFetchEnabled) {
        await post({
            type: 'download-book',
            bookID: book.id,
        })
        return
    }
    const seriesName = series?.name ?? book.series?.name ?? book.series_slug
    const reg = await backgroundFetch().fetch(
        `book:${book.id}`,
        await Promise.all(book.pages.map(p => pageURL(p))),
        {
            title: seriesName + ' ' + bookFullName(book),
            downloadTotal: book.download_size,
            icons: [{ src: icon }],
        },
    )

    await sendCacheUpdate({
        type: 'download',
        downloadType: 'progress',
        id: book.id,
        model: 'book',
        progress: 0,
    })

    reg.addEventListener('progress', async () => {
        if (reg.downloadTotal) {
            await sendCacheUpdate({
                type: 'download',
                downloadType: 'progress',
                id: book.id,
                model: 'book',
                progress: reg.downloaded / reg.downloadTotal,
            })
        }
        if (reg.result === 'success') {
            await sendCacheUpdate({
                type: 'download',
                downloadType: 'progress',
                id: book.id,
                model: 'book',
                progress: 1,
            })
        }
    })
}
