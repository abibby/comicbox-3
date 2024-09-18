import { FunctionalComponent, h } from 'preact'
import { useCallback, useEffect, useState } from 'preact/hooks'
import { listNames } from 'src/api/series'
import { persist } from 'src/cache'
import { Button, ButtonGroup } from 'src/components/button'
import { Data, Form } from 'src/components/form/form'
import { Input } from 'src/components/form/input'
import { Select } from 'src/components/form/select'
import { Modal, ModalBody, ModalFoot, ModalHead } from 'src/components/modal'
import { DB } from 'src/database'
import { List } from 'src/models'
import { useModal, openModal } from 'src/components/modal-controller'
import { useRoute } from 'preact-iso'
import { useSeries } from 'src/hooks/series'
import { encode } from 'src/util'

const listOptions = [['', 'None'], ...listNames] as const

export const EditSeries: FunctionalComponent = () => {
    const { close } = useModal()

    const { params } = useRoute()
    const seriesName = params.series ?? ''
    const [series, seriesLoading] = useSeries(seriesName)

    const [anilistID, setAnilistID] = useState(String(series?.anilist_id ?? ''))
    const findAnilist = useCallback(async () => {
        const modal = openModal(encode`/anilist-match/${seriesName}`)
        const id = await modal.result()
        if (id === undefined) {
            return
        }

        setAnilistID(String(id))
    }, [seriesName])

    useEffect(() => {
        setAnilistID(String(series?.anilist_id ?? ''))
    }, [series?.anilist_id])

    const submit = useCallback(
        async (data: Data) => {
            if (!series) {
                return
            }
            let list: List = List.None
            const rawList = data.get('list')
            if (inEnum(List, rawList)) {
                list = rawList
            }

            await DB.saveSeries(series, {
                anilist_id: anilistID === '' ? -1 : Number(anilistID),
                user_series: {
                    list: list,
                },
            })
            await persist(true)
            close()
        },
        [series, anilistID, close],
    )
    if (seriesLoading) {
        return (
            <Modal>
                <ModalHead>Edit Series</ModalHead>
                <ModalBody>Loading</ModalBody>
            </Modal>
        )
    }
    if (series === null) {
        return (
            <Modal>
                <ModalHead>Edit Series</ModalHead>
                <ModalBody>Not Found</ModalBody>
            </Modal>
        )
    }
    return (
        <Modal>
            <ModalHead>Edit Series</ModalHead>
            <Form onSubmit={submit}>
                <ModalBody>
                    <Select
                        title='List'
                        name='list'
                        value={series.user_series?.list ?? ''}
                        options={listOptions}
                    />
                    <Input
                        title='Anilist ID'
                        name='anilist_id'
                        value={anilistID}
                        onInput={setAnilistID}
                    />
                    <Button onClick={findAnilist}>Find Anilist ID</Button>
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
