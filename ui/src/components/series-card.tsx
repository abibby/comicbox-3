import { FunctionalComponent, h } from 'preact';
import { pageURL } from '../api';
import { Series } from '../models';
import { Card } from './card';

interface SeriesCardProps {
    series: Series
}

export const SeriesCard: FunctionalComponent<SeriesCardProps> = props => {
    return <Card
        image={pageURL(props.series)}
        link={`/series/${props.series.name}`}
        title={props.series.name}
     />
}
