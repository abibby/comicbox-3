import { FunctionalComponent, h } from 'preact'
import { useCallback } from 'preact/hooks'
import { auth, pageURL } from '../api'
import { listNames } from '../api/series'
import { DB } from '../database'
import { useComputed } from '../hooks/computed'
import { Series } from '../models'
import { Card } from './card'
import { ContextMenuItems } from './context-menu'
import { Data, Form } from './form/form'
import { Select } from './form/select'
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
                    openModal(EditSeries, {
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

const listOptions = [['', 'None'], ...listNames] as const

type EditSeriesProps = {
    series: Series
}

const EditSeries: ModalComponent<undefined, EditSeriesProps> = props => {
    const submit = useCallback(
        async (data: Data) => {
            const s = props.series
            const uid = auth.currentID()
            if (uid) {
                s.user_series = {
                    series_name: s.name,
                    user_id: uid,
                    list: data.get('list') || null,
                }
            }

            DB.series.put(s)
            DB.persist(true)
            props.close(undefined)
        },
        [props.close],
    )
    return (
        <Modal>
            <ModalHead>Edit Book</ModalHead>
            <ModalBody>
                <Form onSubmit={submit}>
                    <Select
                        title='List'
                        name='list'
                        value={props.series.user_series?.list ?? ''}
                        options={listOptions}
                    />

                    <button type='submit'>Save</button>
                </Form>
            </ModalBody>
        </Modal>
    )
}
