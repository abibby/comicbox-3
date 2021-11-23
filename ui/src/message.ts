let sw: ServiceWorker | null = null

export type Message = DownloadBookMessage | DownloadSeriesMessage
export type DownloadBookMessage = { type: 'download-book'; bookID: string }
export type DownloadSeriesMessage = {
    type: 'download-series'
    seriesName: string
}

export function setSW(serviceWorker: ServiceWorker | null): void {
    sw = serviceWorker
}

export function post(message: Message): void {
    sw?.postMessage(message)
}
