import { FunctionalComponent, h } from 'preact'
import { route } from 'src/routes'
import { useComputed } from '../hooks/computed'
import { usePageURL } from '../hooks/page'
import { post } from '../message'
import { Series } from '../models'
import { Card } from './card'
import { ContextMenuItems } from './context-menu'
import { openModal } from './modal'
import { EditSeries } from './series-edit'

interface SeriesCardProps {
    series: Series
}

export const SeriesCard: FunctionalComponent<SeriesCardProps> = props => {
    const menu = useComputed<ContextMenuItems>(() => {
        return [
            [
                'edit',
                () =>
                    openModal(EditSeries, {
                        series: props.series,
                    }),
            ],
            [
                'download',
                () =>
                    post({
                        type: 'download-series',
                        seriesName: props.series.name,
                    }),
            ],
        ]
    }, [props.series])

    const coverURL = usePageURL(props.series)

    return (
        <Card
            image={coverURL}
            link={route('series.view', { series: props.series.name })}
            title={props.series.name}
            menu={menu}
        />
    )
}
