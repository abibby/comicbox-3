let reg: ServiceWorkerRegistration | null = null

export type Message =
    | DownloadBookMessage
    | DownloadSeriesMessage
    | BookUpdateMessage
export type MessageType = Message['type']

export type DownloadBookMessage = {
    type: 'download-book'
    bookID: string
}
export type DownloadSeriesMessage = {
    type: 'download-series'
    seriesName: string
}
export type BookUpdateMessage = {
    type: 'book-update'
}

const receiveListeners = new Map<MessageType, Set<(message: Message) => void>>()

export function setSW(
    serviceWorkerRegistration: ServiceWorkerRegistration,
): void {
    reg = serviceWorkerRegistration
}

if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', event => {
        const message: Message = event.data

        for (const cb of receiveListeners.get(message.type) ?? []) {
            cb(message)
        }
    })
}

export function post(message: Message): void {
    if (!reg?.active) {
        throw new Error('No service worker set')
    }
    reg.active.postMessage(message)
}

export function respond(event: ExtendableMessageEvent, message: Message): void {
    if (!event.source) {
        throw new Error('No source on event')
    }
    event.source.postMessage(message)
}

export function addRespondListener(
    type: MessageType,
    callback: (message: Message) => void,
): void {
    const listeners = receiveListeners.get(type) ?? new Set()
    listeners.add(callback)
    receiveListeners.set(type, listeners)
}

export function removeRespondListener(
    type: MessageType,
    callback: (message: Message) => void,
): void {
    const listeners = receiveListeners.get(type)
    if (listeners) {
        listeners.delete(callback)
        if (listeners.size === 0) {
            receiveListeners.delete(type)
        } else {
            receiveListeners.set(type, listeners)
        }
    }
}
