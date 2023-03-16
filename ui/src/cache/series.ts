import { Collection } from 'dexie'
import { series } from 'src/api'
import { setCacheHandler } from 'src/cache/internal'
import { DB } from 'src/database'
import { Series } from 'src/models'

setCacheHandler(series.list, async (req): Promise<Series[]> => {
    let query: Collection<Series>

    if (req.name !== undefined) {
        query = DB.series.where('name').equals(req.name)
    } else if (req.list !== undefined) {
        query = DB.series.where('user_series.list').equals(req.list)
    } else {
        query = DB.series.orderBy('name')
    }

    if (req.limit !== undefined) {
        query = query.limit(req.limit)
    }
    return query.toArray()
})
