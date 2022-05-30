import { h } from 'preact'
import { useCallback, useState } from 'preact/hooks'
import { listNames } from '../api/series'
import { persist } from '../cache'
import { DB } from '../database'
import { List, Series } from '../models'
import { AnilistMatch } from './anilist-match'
import { Button, ButtonGroup } from './button'
import { Data, Form } from './form/form'
import { Input } from './form/input'
import { Select } from './form/select'
import {
    Modal,
    ModalBody,
    ModalComponent,
    ModalFoot,
    ModalHead,
    openModal,
} from './modal'

const listOptions = [['', 'None'], ...listNames] as const

type EditSeriesProps = {
    series: Series
}

export const EditSeries: ModalComponent<undefined, EditSeriesProps> = ({
    series,
    close,
}) => {
    const [anilistID, setAnilistID] = useState(
        series.anilist_id !== null ? String(series.anilist_id) : '',
    )
    const findAnilist = useCallback(async () => {
        if (series !== undefined) {
            const id = await openModal(AnilistMatch, { series: series })
            if (id === undefined) {
                return
            }
            setAnilistID(String(id))
        }
    }, [series])

    const submit = useCallback(
        async (data: Data) => {
            let list: List = List.None
            const rawList = data.get('list')
            if (inEnum(List, rawList)) {
                list = rawList
            }
            await DB.saveSeries(series, {
                anilist_id: data.getNumber('anilist_id'),
                user_series: {
                    list: list,
                },
            })
            await persist(true)
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
                    <div class='row'>
                        <Input
                            title='Anilist ID'
                            name='anilist_id'
                            value={anilistID}
                            onInput={setAnilistID}
                        />
                        <Button onClick={findAnilist}>Find Anilist ID</Button>
                    </div>
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
    return Object.values(e).includes(v as List)
}
