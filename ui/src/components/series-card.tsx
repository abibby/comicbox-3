import { FunctionalComponent, h } from 'preact'
import { useCallback } from 'preact/hooks'
import { auth, pageURL } from '../api'
import { DB } from '../database'
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
                        series: props.series,
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
    series: Series
}

const EditSeries: ModalComponent<undefined, EditSeriesProps> = props => {
    const submit = useCallback(
        async (data: Map<string, string>) => {
            const s = props.series
            const uid = auth.currentID()
            if (uid) {
                s.user_series = {
                    series_name: s.name,
                    user_id: uid,
                    list: data.get('list') ?? null,
                }
            }

            DB.series.put(s)
            DB.persist()
            props.close(undefined)
        },
        [props.close],
    )
    return (
        <Modal>
            <ModalHead>Edit Book</ModalHead>
            <ModalBody>
                <Form onSubmit={submit}>
                    <Input
                        title='List'
                        name='list'
                        value={props.series.user_series?.list ?? ''}
                    />

                    <button type='submit'>Save</button>
                </Form>
            </ModalBody>
        </Modal>
    )
}
