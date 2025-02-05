import { FunctionalComponent, h } from 'preact'
import { seriesCompare, usePromptUpdate } from 'src/hooks/prompt-update'
import { Card, CardList } from 'src/components/card'
import { SeriesCard } from 'src/components/series-card'
import { Series } from 'src/models'

interface SeriesListProps {
    title?: string
    series: Series[] | null
    scroll?: 'auto' | 'horizontal' | 'vertical'
    loading?: boolean
}

export const SeriesList: FunctionalComponent<SeriesListProps> = props => {
    const series = usePromptUpdate(props.series, seriesCompare)

    if (series === null || props.loading) {
        return (
            <CardList title={props.title} scroll={props.scroll}>
                <Card title='title' placeholder />
                <Card title='title' placeholder />
                <Card title='title' placeholder />
            </CardList>
        )
    }
    return (
        <CardList title={props.title} scroll={props.scroll}>
            {series.map(s => (
                <SeriesCard key={s.name} series={s} />
            ))}
        </CardList>
    )
}
