import { Book, Page, PageType } from 'src/models'

export function splitPages(
    book: Book,
    twoPage: boolean,
    withDeleted = false,
): Array<[Page] | [Page, Page]> {
    let p = book.pages
    if (!withDeleted) {
        p = p.filter(p => p.type !== PageType.Deleted)
    }
    const pages: Array<[Page] | [Page, Page]> = []

    for (let i = 0; i < p.length; i++) {
        const page = p[i]
        const nextPage = p[i + 1]

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
