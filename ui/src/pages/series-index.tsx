import { Fragment, FunctionalComponent, h } from 'preact'
import { SeriesList } from 'src/components/series-list'
import { seriesCompare, usePromptUpdate } from 'src/hooks/prompt-update'
import { useSeriesList } from 'src/hooks/series'

export const SeriesIndex: FunctionalComponent = () => {
    const [liveSeries] = useSeriesList('series-index', { limit: null })

    const series = usePromptUpdate(liveSeries, seriesCompare)

    return (
        <Fragment>
            <SeriesList title='Series' scroll='vertical' series={series} />
        </Fragment>
    )
}
