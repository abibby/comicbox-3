let sw: ServiceWorker | null = null

export type Message = DownloadMessage
export type DownloadMessage = { type: 'download'; bookID: string }

export function setSW(serviceWorker: ServiceWorker | null): void {
    sw = serviceWorker
}

export function post(message: Message): void {
    sw?.postMessage(message)
}
