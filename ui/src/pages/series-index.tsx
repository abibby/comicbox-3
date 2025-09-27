import { bind } from '@zwzn/spicy'
import { ComponentChildren, Fragment, FunctionalComponent, h } from 'preact'
import { X } from 'preact-feather'
import { useMemo } from 'preact/hooks'
import { SeriesList } from 'src/components/series-list'
import { seriesCompare, usePromptUpdate } from 'src/hooks/prompt-update'
import { useQueryState } from 'src/hooks/query-state'
import { useSeriesList } from 'src/hooks/series'
import styles from 'src/pages/series-index.module.css'

export const SeriesIndex: FunctionalComponent = () => {
    const [liveSeries] = useSeriesList('series-index', { limit: null })

    const series = usePromptUpdate(liveSeries, seriesCompare)
    const [genreFilter, setGenreFilter] = useQueryState('genre', '')
    const [yearFilter, setYearFilter] = useQueryState('year', '')

    const filteredSeries = useMemo(() => {
        return (
            series?.filter(s => {
                if (genreFilter && !s.genres?.includes(genreFilter)) {
                    return false
                }
                if (yearFilter && String(s.year) !== yearFilter) {
                    return false
                }
                return true
            }) ?? null
        )
    }, [series, genreFilter, yearFilter])

    return (
        <Fragment>
            {genreFilter && (
                <Filter onClose={bind('', setGenreFilter)}>
                    Genre: {genreFilter}
                </Filter>
            )}
            {yearFilter && (
                <Filter onClose={bind('', setYearFilter)}>
                    Year: {yearFilter}
                </Filter>
            )}
            <SeriesList
                title='Series'
                scroll='vertical'
                series={filteredSeries}
            />
        </Fragment>
    )
}

type FilterProps = {
    children: ComponentChildren
    onClose: () => void
}

function Filter(props: FilterProps) {
    return (
        <span class={styles.filter}>
            {props.children}{' '}
            <X class={styles.filterClose} onClick={props.onClose} />
        </span>
    )
}
