let lastActivate = 0
const minInactiveTime = 60 * 1000

export function addOnActive(handler: () => Promise<void>): void {
    onActivateHandlers.push(handler)
}

const onActivateHandlers: Array<() => Promise<void>> = []

export async function onActivate(force = false): Promise<void> {
    if (!force && lastActivate + minInactiveTime > Date.now()) {
        return
    }
    lastActivate = Date.now()
    await Promise.all(onActivateHandlers.map(h => h()))
}

export function init(): void {
    onActivate()
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            onActivate()
        }
    })
}
