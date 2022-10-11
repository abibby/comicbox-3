import { series } from 'src/api'
import { setCacheHandler } from 'src/cache/internal'
import { DB } from 'src/database'
import { Series } from 'src/models'

setCacheHandler(series.list, async (req): Promise<Series[]> => {
    if (req.name !== undefined) {
        return DB.series.where('name').equals(req.name).toArray()
    }

    if (req.list !== undefined) {
        return DB.series.where('user_series.list').equals(req.list).toArray()
    }

    return DB.series.orderBy('name').toArray()
})
