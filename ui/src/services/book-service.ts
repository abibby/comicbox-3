import { Page, PageType } from 'src/models'

export interface PageWithIndex extends Page {
    index: number
}

export function splitPages(
    p: Page[],
    longStrip: boolean,
    twoPage: boolean,
    withDeleted = false,
): Array<[PageWithIndex] | [PageWithIndex, PageWithIndex]> {
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
