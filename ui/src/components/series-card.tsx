import { FunctionalComponent, h } from 'preact'
import { Card } from 'src/components/card'
import { ContextMenuItems } from 'src/components/context-menu'
import { openModal } from 'src/components/modal'
import { EditSeries } from 'src/components/series-edit'
import { useComputed } from 'src/hooks/computed'
import { usePageURL } from 'src/hooks/page'
import { post } from 'src/message'
import { Series } from 'src/models'
import { route } from 'src/routes'

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
