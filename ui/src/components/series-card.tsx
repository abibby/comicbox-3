import { FunctionalComponent, h } from 'preact'
import { useCallback } from 'preact/hooks'
import { pageURL, userSeries } from '../api'
import { useComputed } from '../hooks/computed'
import { Series } from '../models'
import { Card } from './card'
import { ContextMenuItems } from './context-menu'
import { Form } from './form/form'
import { Input } from './form/input'
import { Modal, ModalBody, ModalComponent, ModalHead, openModal } from './modal'

interface SeriesCardProps {
    series: Series
}

export const SeriesCard: FunctionalComponent<SeriesCardProps> = props => {
    const menu = useComputed<ContextMenuItems>(() => {
        return [
            ['view', `/series/${props.series.name}`],
            [
                'edit',
                () =>
                    openModal('Edit book', EditSeries, {
                        name: props.series.name,
                        list: props.series.user_series?.list ?? '',
                    }),
            ],
        ]
    }, [props.series.name, props.series.user_series?.list])
    return (
        <Card
            image={pageURL(props.series)}
            link={`/series/${props.series.name}`}
            title={props.series.name}
            menu={menu}
        />
    )
}

type EditSeriesProps = {
    name: string
    list: string
}

const EditSeries: ModalComponent<undefined, EditSeriesProps> = props => {
    const submit = useCallback(
        async (data: Map<string, string>) => {
            await userSeries.update(props.name, {
                list: data.get('list') ?? null,
            })
            props.close(undefined)
        },
        [props.close],
    )
    return (
        <Modal>
            <ModalHead>Edit Book</ModalHead>
            <ModalBody>
                <Form onSubmit={submit}>
                    <Input title='List' name='list' value={props.list} />

                    <button type='submit'>Save</button>
                </Form>
            </ModalBody>
        </Modal>
    )
}
