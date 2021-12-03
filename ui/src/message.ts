let reg: ServiceWorkerRegistration | null = null

export type Message = DownloadBookMessage | DownloadSeriesMessage
export type DownloadBookMessage = { type: 'download-book'; bookID: string }
export type DownloadSeriesMessage = {
    type: 'download-series'
    seriesName: string
}

const receiveListeners: Array<() => void> = []

export function setSW(
    serviceWorkerRegistration: ServiceWorkerRegistration,
): void {
    reg = serviceWorkerRegistration
}

navigator.serviceWorker.addEventListener('message', event => {
    for (const cb of receiveListeners) {
        cb()
    }
})

export function post(message: Message): void {
    if (!reg?.active) {
        throw new Error('No service worker set')
    }
    reg.active.postMessage(message)
}

export function onReceive(callback: () => void): void {
    receiveListeners.push(callback)
}
