import { FunctionalComponent, h } from 'preact'
import { useCallback } from 'preact/hooks'
import { listNames } from '../api/series'
import { persist } from '../cache'
import { DB } from '../database'
import { useComputed } from '../hooks/computed'
import { usePageURL } from '../hooks/page'
import { post } from '../message'
import { Series } from '../models'
import { Card } from './card'
import { ContextMenuItems } from './context-menu'
import { Data, Form } from './form/form'
import { Select } from './form/select'
import {
    Modal,
    ModalBody,
    ModalComponent,
    ModalFoot,
    ModalHead,
    openModal,
} from './modal'

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

const EditSeries: ModalComponent<undefined, EditSeriesProps> = ({
    series,
    close,
}) => {
    const submit = useCallback(
        async (data: Data) => {
            DB.saveSeries(series, {
                user_series: {
                    list: data.get('list') || null,
                },
            })
            persist(true)
            close(undefined)
        },
        [series, close],
    )
    return (
        <Modal>
            <ModalHead close={close}>Edit Book</ModalHead>
            <Form onSubmit={submit}>
                <ModalBody>
                    <Select
                        title='List'
                        name='list'
                        value={series.user_series?.list ?? ''}
                        options={listOptions}
                    />
                </ModalBody>
                <ModalFoot>
                    <button type='submit'>Save</button>
                </ModalFoot>
            </Form>
        </Modal>
    )
}
