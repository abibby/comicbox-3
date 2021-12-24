import { h } from 'preact'
import { useCallback } from 'preact/hooks'
import { listNames } from '../api/series'
import { persist } from '../cache'
import { DB } from '../database'
import { List, Series } from '../models'
import { Button, ButtonGroup } from './button'
import { Data, Form } from './form/form'
import { Select } from './form/select'
import { Modal, ModalBody, ModalComponent, ModalFoot, ModalHead } from './modal'

const listOptions = [['', 'None'], ...listNames] as const

type EditSeriesProps = {
    series: Series
}

export const EditSeries: ModalComponent<undefined, EditSeriesProps> = ({
    series,
    close,
}) => {
    const submit = useCallback(
        async (data: Data) => {
            let list: List | null = null
            const rawList = data.get('list')
            if (inEnum(List, rawList)) {
                list = rawList
            }
            DB.saveSeries(series, {
                user_series: {
                    list: list,
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
                    <ButtonGroup>
                        <Button type='submit' color='primary'>
                            Save
                        </Button>
                    </ButtonGroup>
                </ModalFoot>
            </Form>
        </Modal>
    )
}

function inEnum(e: typeof List, v: unknown): v is List {
    if (typeof v !== 'string' && typeof v !== 'number') {
        return false
    }
    return v in e
}
