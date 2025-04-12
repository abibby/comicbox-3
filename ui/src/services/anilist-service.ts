import { anilistAPI, seriesAPI } from 'src/api'
import { DBBook } from 'src/database'

export async function updateAnilist(b: DBBook): Promise<void> {
    const [s] = await seriesAPI.list({
        slug: b.series_slug,
        limit: 1,
    })
    if (s === undefined || s.metadata_id === null) {
        return
    }

    const [service, id] = s.metadata_id.split('://')
    if (service !== 'anilist') {
        return
    }

    await anilistAPI.updateManga({
        mediaId: Number(id),
        progress: b.chapter !== null ? Math.floor(b.chapter) : null,
        progressVolumes: b.volume,
        // startedAt: ,
    })
}
