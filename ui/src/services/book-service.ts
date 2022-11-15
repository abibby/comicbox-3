import { Book, Page, PageType } from 'src/models'

export function splitPages(
    book: Book,
    twoPage: boolean,
    withDeleted = false,
): Array<[Page] | [Page, Page]> {
    let p = book.pages
    if (withDeleted) {
        p = p.filter(p => p.type !== PageType.Deleted)
    }
    const pages: Array<[Page] | [Page, Page]> = []
    const pageCount = p.length

    for (let i = 0; i < pageCount; i++) {
        const page = getPage(book, i, withDeleted)
        const nextPage = getPage(book, i + 1, withDeleted)
        if (page === undefined) {
            continue
        }
        if (nextPage && showTwoPages(twoPage, page, nextPage)) {
            pages.push([page, nextPage])
            i++
        } else {
            pages.push([page])
        }
    }
    return pages
}

function getPage(
    book: Book,
    page: number,
    withDelete: boolean,
): Page | undefined {
    let currentPage = -1
    for (const p of book.pages) {
        if (p.type !== PageType.Deleted || withDelete) {
            currentPage++
        }

        if (currentPage === page) {
            return p
        }
    }
    return undefined
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
