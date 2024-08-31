import { FunctionalComponent, h } from 'preact'
import { Card, CardList } from 'src/components/card'
import { SeriesCard } from 'src/components/series-card'
import { Series } from 'src/models'

interface SeriesListProps {
    title?: string
    series: Series[] | null
    scroll?: 'auto' | 'horizontal' | 'vertical'
}

export const SeriesList: FunctionalComponent<SeriesListProps> = props => {
    if (props.series === null) {
        return (
            <CardList title={props.title} scroll={props.scroll}>
                <Card title='title' placeholder />
            </CardList>
        )
    }
    return (
        <CardList title={props.title} scroll={props.scroll}>
            {props.series.map(s => (
                <SeriesCard key={s.name} series={s} />
            ))}
        </CardList>
    )
}
