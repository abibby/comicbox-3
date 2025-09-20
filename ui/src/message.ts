import type { BackgroundFetchOptions } from './background-fetch'

export type Message =
    | DownloadBookMessage
    | DownloadSeriesMessage
    | DownloadMessage
    | BookUpdateMessage
    | CheckUpdateMessage
    | ReloadMessage
    | SkipWaitingMessage
    | BackgroundFetchMessage

export type MessageType = Message['type']

export type DownloadBookMessage = {
    type: 'download-book'
    bookID: string
}
export type DownloadSeriesMessage = {
    type: 'download-series'
    seriesSlug: string
}
export type BookUpdateMessage = {
    type: 'book-update'
}
export type DownloadMessage =
    | DownloadProgressMessage
    | DownloadCompleteMessage
    | DownloadRemovedMessage

export type DownloadProgressMessage = {
    type: 'download'
    downloadType: 'progress'
    model: 'book' | 'series'
    id: string
    progress: number
}
export type DownloadCompleteMessage = {
    type: 'download'
    downloadType: 'complete'
    model: 'book' | 'series'
    id: string
}
export type DownloadRemovedMessage = {
    type: 'download'
    downloadType: 'removed'
    model: 'book' | 'series'
    id: string
}
export type CheckUpdateMessage = {
    type: 'check-update'
}
export type SkipWaitingMessage = {
    type: 'skip-waiting'
}
export type ReloadMessage = {
    type: 'reload'
}
export type BackgroundFetchMessage = {
    type: 'background-fetch'
    id: string
    requests: RequestInfo[]
    options: BackgroundFetchOptions | undefined
}

const receiveListeners = new Map<MessageType, Set<(message: Message) => void>>()

if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', event => {
        const message: Message = event.data

        for (const cb of receiveListeners.get(message.type) ?? []) {
            cb(message)
        }
    })
}

export async function post(message: Message): Promise<void> {
    const reg = await navigator.serviceWorker.ready
    if (!reg?.active) {
        throw new Error('Service worker not registered')
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
