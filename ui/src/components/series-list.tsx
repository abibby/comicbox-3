import { FunctionalComponent, h } from 'preact'
import { Card, CardList } from 'src/components/card'
import { SeriesCard } from 'src/components/series-card'
import { Series } from 'src/models'

interface SeriesListProps {
    title?: string
    series: Series[] | null
    scroll?: 'auto' | 'horizontal' | 'vertical'
    loading?: boolean
    link?: string
}

export const SeriesList: FunctionalComponent<SeriesListProps> = props => {
    if (props.series === null || props.loading) {
        return (
            <CardList
                title={props.title}
                scroll={props.scroll}
                link={props.link}
            >
                <Card title='title' placeholder />
                <Card title='title' placeholder />
                <Card title='title' placeholder />
            </CardList>
        )
    }
    return (
        <CardList title={props.title} scroll={props.scroll} link={props.link}>
            {props.series.map(s => (
                <SeriesCard key={s.slug} series={s} />
            ))}
        </CardList>
    )
}
