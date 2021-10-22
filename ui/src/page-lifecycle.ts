import { series } from './api'
import { updateList } from './cache'
import { DB } from './database'

let lastActivate = 0
const minInactiveTime = 60 * 1000

export async function onActivate(force = false): Promise<void> {
    if (!force && lastActivate + minInactiveTime > Date.now()) {
        return
    }
    lastActivate = Date.now()

    await updateList('series', {}, DB.series, series.list)
}

export function init(): void {
    onActivate()
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            onActivate()
        }
    })
}
