import { FunctionalComponent, h } from 'preact'
import { Card } from 'src/components/card'
import { ContextMenuItems } from 'src/components/context-menu'
import { usePageURL } from 'src/hooks/page'
import { post } from 'src/message'
import { Series } from 'src/models'
import { route } from 'src/routes'
import { openModal } from 'src/components/modal-controller'
import { useMemo } from 'preact/hooks'

interface SeriesCardProps {
    series: Series
}

export const SeriesCard: FunctionalComponent<SeriesCardProps> = props => {
    const menu = useMemo<ContextMenuItems>(() => {
        return [
            ['edit', () => openModal(`/series/${props.series.name}`)],
            [
                'download',
                () =>
                    post({
                        type: 'download-series',
                        seriesName: props.series.name,
                    }),
            ],
        ]
    }, [props.series.name])

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
