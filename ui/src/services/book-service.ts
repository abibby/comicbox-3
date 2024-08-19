import { useMemo } from 'preact/hooks'
import { Page, PageType } from 'src/models'

export interface PageWithIndex extends Page {
    index: number
}

export type SplitPages = Array<[PageWithIndex] | [PageWithIndex, PageWithIndex]>

export function splitPages(
    p: Page[],
    longStrip: boolean,
    twoPage: boolean,
    withDeleted = false,
): SplitPages {
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

export function useSplitPages(
    pages: Page[],
    longStrip: boolean,
    twoPage: boolean,
    withDeleted = false,
): SplitPages {
    return useMemo(() => {
        return splitPages(pages, longStrip, twoPage, withDeleted)
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
