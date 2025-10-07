import { clearContextMenus } from 'src/components/context-menu'
import { clearToasts } from 'src/components/toast'

export class RingBuffer<T> {
    #buffer: T[]
    #current = -1
    #length = 0

    constructor(public readonly size: number) {
        this.#buffer = new Array(size)
    }

    public get length(): number {
        return this.#length
    }

    public push(v: T) {
        this.#current = (this.#current + 1) % this.size
        this.#buffer[this.#current] = v
        if (this.#length < this.size) this.#length++
    }

    public get(i: number): T | undefined {
        return this.#buffer[(this.#current - i + this.size) % this.size]
    }
}

export const history = new RingBuffer<string>(50)

export function changePage(url: string): void {
    clearToasts()
    clearContextMenus()
    history.push(url)
}
