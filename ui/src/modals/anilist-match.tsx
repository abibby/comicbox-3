import { bind } from '@zwzn/spicy'
import { FunctionalComponent, h } from 'preact'
import { useRoute } from 'preact-iso'
import { useState } from 'preact/hooks'
import { searchManga, SearchMangaResponse } from 'src/api/anilist'
import { Card, CardList } from 'src/components/card'
import { Input } from 'src/components/form/input'
import { Modal, ModalBody, ModalHead } from 'src/components/modal'
import { useAsyncCallback } from 'src/hooks/async'
import { useModal } from 'src/components/modal-controller'
import { useSeries } from 'src/hooks/series'

export const AnilistMatch: FunctionalComponent = () => {
    const { params } = useRoute()
    const { close } = useModal()
    const seriesName = params.name ?? ''
    const [search, setSearch] = useState(seriesName)
    const result = useAsyncCallback(async () => {
        return searchManga(search)
    }, [search])

    const [series] = useSeries(seriesName)

    let data: SearchMangaResponse[] = []

    if (result.status === 'success') {
        data = result.data.results
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
                <CardList scroll='vertical'>
                    {data.map(r => {
                        const current = series?.anilist_id === r.id
                        let subtitle: string = r.format
                        if (r.title.english) {
                            subtitle += ' • ' + r.title.english
                        }
                        return (
                            <Card
                                key={r.id}
                                title={
                                    r.title.userPreferred +
                                    (current ? ' (current)' : '')
                                }
                                subtitle={subtitle}
                                image={r.coverImage.large}
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
