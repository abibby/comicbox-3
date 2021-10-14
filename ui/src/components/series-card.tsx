import { FunctionalComponent, h } from 'preact';
import { pageURL } from '../api';
import { useComputed } from '../hooks/computed';
import { Series } from '../models';
import { Card } from './card';
import { ContextMenuItems } from './context-menu';

interface SeriesCardProps {
    series: Series
}

export const SeriesCard: FunctionalComponent<SeriesCardProps> = props => {
    const menu = useComputed<ContextMenuItems>(() => {
        return [
            ['view', `/series/${props.series.name}`]
        ]
    }, [props.series.name])
    return <Card
        image={pageURL(props.series)}
        link={`/series/${props.series.name}`}
        title={props.series.name}
        menu={menu}
     />
}
