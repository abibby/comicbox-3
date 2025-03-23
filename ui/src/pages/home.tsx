import { Fragment, FunctionalComponent, h } from 'preact'
import { useMemo } from 'preact/hooks'
import { BookList } from 'src/components/book-list'
import { SeriesList } from 'src/components/series-list'
import { useBookList } from 'src/hooks/book'
import {
    bookCompare,
    seriesCompare,
    usePromptUpdate,
} from 'src/hooks/prompt-update'
import { useSeriesList } from 'src/hooks/series'
import { Book, Series, SeriesOrder } from 'src/models'
import { notNullish } from 'src/util'

export const Home: FunctionalComponent = () => {
    return (
        <Fragment>
            <Reading />
            <Latest />
            <NewSeries />
        </Fragment>
    )
}

export const Reading: FunctionalComponent = () => {
    const [series, seriesLoading] = useSeriesList('reading', {
        order_by: SeriesOrder.LastRead,
        list: 'reading',
        limit: null,
    })

    const liveBooks = useMemo(
        () =>
            series
                .sort(byLastUpdated)
                .map(s => s.latest_book)
                .filter(notNullish),
        [series],
    )
    const books = usePromptUpdate(liveBooks, readingBookCompare)

    if (!seriesLoading && liveBooks?.length === 0) {
        return <Fragment></Fragment>
    }
    return (
        <BookList
            title='Comtinue Reading'
            books={books}
            series={series}
            loading={seriesLoading}
        />
    )
}
function byLastUpdated(a: Series, b: Series) {
    return (
        Math.max(
            getTime(b.user_series?.last_read_at),
            getTime(b.latest_book?.created_at),
        ) -
        Math.max(
            getTime(a.user_series?.last_read_at),
            getTime(a.latest_book?.created_at),
        )
    )
}
function getTime(str: string | undefined): number {
    if (str === undefined) {
        return 0
    }
    return new Date(str).getTime()
}

export const Latest: FunctionalComponent = () => {
    const [liveBooks, loading] = useBookList('latest', {
        limit: 15,
        order_by: 'created_at',
        order: 'desc',
        with_series: true,
    })

    const books = usePromptUpdate(liveBooks, bookCompare)

    return <BookList title='Latest Books' books={books} loading={loading} />
}

export const NewSeries: FunctionalComponent = () => {
    const [liveSeries, loading] = useSeriesList('latest', {
        limit: 15,
        order_by: SeriesOrder.CreatedAt,
        order: 'desc',
    })

    const series = usePromptUpdate(liveSeries, seriesCompare)

    return (
        <SeriesList title='Latest Series' series={series} loading={loading} />
    )
}

function readingBookCompare(a: Book, b: Book): boolean {
    return a.series_slug === b.series_slug
}
