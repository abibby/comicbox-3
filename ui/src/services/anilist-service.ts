import { anilistAPI, seriesAPI } from 'src/api'
import { DBBook } from 'src/database'

export async function updateAnilist(b: DBBook): Promise<void> {
    const [s] = await seriesAPI.list({
        slug: b.series_slug,
    })
    if (s === undefined || s.anilist_id === null) {
        return
    }

    await anilistAPI.updateManga({
        mediaId: s.anilist_id,
        progress: b.chapter !== null ? Math.floor(b.chapter) : null,
        progressVolumes: b.volume,
        // startedAt: ,
    })
}
