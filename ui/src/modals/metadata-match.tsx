import { bind } from '@zwzn/spicy'
import { FunctionalComponent, h } from 'preact'
import { useRoute } from 'preact-iso'
import { useEffect, useState } from 'preact/hooks'
import { Card, CardList } from 'src/components/card'
import { Input } from 'src/components/form/input'
import { Modal, ModalBody, ModalHead } from 'src/components/modal'
import { useDebouncedAsyncCallback } from 'src/hooks/async'
import { useModal } from 'src/components/modal-controller'
import { useSeries } from 'src/hooks/series'
import { metadataList } from 'src/api/metadata'
import { SeriesMetadata } from 'src/models'

export const MetadataMatch: FunctionalComponent = () => {
    const { params } = useRoute()
    const { close } = useModal()
    const seriesSlug = params.slug ?? ''
    const [search, setSearch] = useState('')
    const result = useDebouncedAsyncCallback(
        async signal => {
            if (search == '') {
                return []
            }
            const resp = await metadataList(search, signal)
            return resp.data
        },
        [search],
    )

    const [series] = useSeries(seriesSlug)

    useEffect(() => {
        setSearch(series?.name ?? '')
    }, [series])

    let data: SeriesMetadata[] = []

    if (result.status === 'success') {
        data = result.data
    }

    return (
        <Modal>
            <ModalHead>Anilist Match</ModalHead>
            <ModalBody>
                <Input
                    title='Search'
                    name='search'
                    value={search}
                    onInput={setSearch}
                />
                {result.status === 'pending' && <div>loading</div>}
                <CardList scroll='vertical'>
                    {data.map(r => {
                        const current = series?.metadata_id === r.id
                        let subtitle: string = `${r.service} • ${r.match_distance}`
                        if (r.aliases) {
                            subtitle += ' • ' + r.aliases
                        }
                        return (
                            <Card
                                key={r.id}
                                title={r.title + (current ? ' (current)' : '')}
                                subtitle={subtitle}
                                image={r.cover_image_url}
                                link={bind(r.id, close)}
                                progress={current ? 1 : 0}
                            />
                        )
                    })}
                </CardList>
            </ModalBody>
        </Modal>
    )
}
