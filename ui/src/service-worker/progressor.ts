import { sendMessage } from 'src/service-worker/send-message'

export class Progressor {
    private current = 0

    constructor(
        private total: number,
        private model: 'book' | 'series',
        private id: string,
    ) {}

    async start(): Promise<void> {
        await sendMessage({
            type: 'download-progress',
            model: this.model,
            id: this.id,
            progress: 0,
        })
    }

    async finish(): Promise<void> {
        await sendMessage({
            type: 'download-complete',
            model: this.model,
            id: this.id,
        })
    }

    async next(): Promise<void> {
        this.current++
        await sendMessage({
            type: 'download-progress',
            model: this.model,
            id: this.id,
            progress: this.current / this.total,
        })
    }
}
