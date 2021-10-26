import { series } from '../api'
import { DB } from '../database'
import { Series } from '../models'
import { setCacheHandler } from './internal'

setCacheHandler(series.list, async (req): Promise<Series[]> => {
    if (req.name !== undefined) {
        return DB.series.where('name').equals(req.name).toArray()
    }

    if (req.list !== undefined) {
        return DB.series.where('user_series.list').equals(req.list).toArray()
    }

    return DB.series.orderBy('name').toArray()
})
