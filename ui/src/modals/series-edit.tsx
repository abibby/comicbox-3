import { FunctionalComponent, h } from 'preact'
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import { persist } from 'src/cache'
import { Button } from 'src/components/button'
import { Data, Form } from 'src/components/form/form'
import { Input } from 'src/components/form/input'
import {
    Modal,
    ModalBody,
    ModalHead,
    ModalHeadActions,
} from 'src/components/modal'
import { DB } from 'src/database'
import { useModal, openModal } from 'src/components/modal-controller'
import { useRoute } from 'preact-iso'
import { useSeries } from 'src/hooks/series'
import { encode } from 'src/util'
import { updateSeriesMetadata } from 'src/services/series-service'
import { TextArea } from 'src/components/form/textarea'
import { Locker } from 'src/components/form/locker'

export const EditSeries: FunctionalComponent = () => {
    const { close } = useModal()

    const { params } = useRoute()
    const seriesSlug = params.series ?? ''
    const [series, seriesLoading] = useSeries(seriesSlug)

    const [metadataID, setMetadataID] = useState(series?.metadata_id ?? '')
    const metadataIDChanged = useRef(false)
    const findMeta = useCallback(async () => {
        const modal = openModal(encode`/metadata/${seriesSlug}`)
        const id = await modal.result()
        if (id === undefined) {
            return
        }

        setMetadataID(String(id))
        metadataIDChanged.current = true
    }, [seriesSlug])

    useEffect(() => {
        setMetadataID(String(series?.metadata_id ?? ''))
    }, [series?.metadata_id, series?.name])

    const submit = useCallback(
        async (data: Data) => {
            if (!series) {
                return
            }

            const yearStr = data.get('year')

            await DB.saveSeries(series, {
                name: data.get('name') ?? '',
                year: yearStr ? Number(yearStr) : null,
                aliases: data.get('aliases')?.split('\n') ?? [],
                genres: data.get('genres')?.split('\n') ?? [],
                tags: data.get('tags')?.split('\n') ?? [],
                description: data.get('description') ?? '',
                metadata_id: metadataID === '' ? null : metadataID,
                locked_fields: data.getAll('locked_fields') ?? [],
            })
            await persist(true)
            if (metadataIDChanged.current) {
                void updateSeriesMetadata(series.slug)
            }
            close()
        },
        [series, metadataID, close],
    )

    if (!seriesLoading && series === null) {
        return (
            <Modal>
                <ModalHead>Edit Series</ModalHead>
                <ModalBody>Not Found</ModalBody>
            </Modal>
        )
    }

    return (
        <Modal>
            <Form onSubmit={submit} loading={seriesLoading}>
                <ModalHead>
                    Edit Series
                    <ModalHeadActions>
                        <button type='submit'>save</button>
                    </ModalHeadActions>
                </ModalHead>
                <ModalBody>
                    <Input title='Name' name='name' value={series?.name}>
                        <Locker name='name' locked={series?.locked_fields} />
                    </Input>
                    <Input
                        title='Year'
                        name='year'
                        value={String(series?.year)}
                        type='number'
                    >
                        <Locker name='year' locked={series?.locked_fields} />
                    </Input>
                    <TextArea
                        title='Aliases'
                        name='aliases'
                        value={series?.aliases.join('\n')}
                    >
                        <Locker name='aliases' locked={series?.locked_fields} />
                    </TextArea>
                    <TextArea
                        title='Genres'
                        name='genres'
                        value={series?.genres.join('\n')}
                    >
                        <Locker name='genres' locked={series?.locked_fields} />
                    </TextArea>
                    <TextArea
                        title='Tags'
                        name='tags'
                        value={series?.tags.join('\n')}
                    >
                        <Locker name='tags' locked={series?.locked_fields} />
                    </TextArea>
                    <TextArea
                        title='Description'
                        name='description'
                        value={series?.description}
                    >
                        <Locker
                            name='description'
                            locked={series?.locked_fields}
                        />
                    </TextArea>
                    <Input
                        title='Directory'
                        name='directory'
                        readonly
                        value={series?.directory}
                    />
                    <Input
                        title='Metadata ID'
                        name='metadata_id'
                        value={metadataID}
                        onInput={setMetadataID}
                    >
                        <Button onClick={findMeta}>Find Anilist ID</Button>
                    </Input>
                </ModalBody>
            </Form>
        </Modal>
    )
}
