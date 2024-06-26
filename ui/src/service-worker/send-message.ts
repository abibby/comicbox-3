import { type Message } from 'src/message'

export async function sendMessage(message: Message): Promise<void> {
    const windows = await clients.matchAll({
        includeUncontrolled: true,
        type: 'window',
    })
    for (const w of windows) {
        w.postMessage(message)
    }
}
