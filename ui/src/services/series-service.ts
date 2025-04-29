import { metadataUpdate } from 'src/api/metadata'
import { invalidateCache } from 'src/cache'
import { DB } from 'src/database'

export async function updateSeriesMetadata(slug: string): Promise<void> {
    const s = await metadataUpdate(slug)
    await DB.fromNetwork([s])
    invalidateCache(true)
}
