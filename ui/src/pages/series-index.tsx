import { Fragment, FunctionalComponent, h } from 'preact'
import { SeriesList } from 'src/components/series-list'
import { useSeriesList } from 'src/hooks/series'

export const SeriesIndex: FunctionalComponent = () => {
    const [series] = useSeriesList('series-index', { limit: null })

    return (
        <Fragment>
            <h1>Series</h1>
            <SeriesList scroll='vertical' series={series} />
        </Fragment>
    )
}
