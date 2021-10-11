import { FunctionalComponent, h } from 'preact';
import { Series } from '../models';
import { Card } from './card';

interface SeriesCardProps {
    series: Series
}

export const SeriesCard: FunctionalComponent<SeriesCardProps> = props => {
    return <Card
        image={props.series.cover_url}
        link={`/series/${props.series.name}`}
        title={props.series.name}
     />
}
