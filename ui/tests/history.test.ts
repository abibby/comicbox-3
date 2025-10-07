import { RingBuffer } from 'src/history'
import { describe, test, expect } from 'vitest'

describe('RingBuffer', () => {
    test('get from empty buffer', () => {
        const buffer = new RingBuffer(10)

        expect(buffer.get(0)).toBe(undefined)
    })

    test('get pushed item', () => {
        const buffer = new RingBuffer(10)

        buffer.push(1)
        buffer.push(2)

        expect(buffer.get(0)).toBe(2)
        expect(buffer.get(1)).toBe(1)
        expect(buffer.get(2)).toBe(undefined)
    })

    test('overwrites', () => {
        const buffer = new RingBuffer(10)

        for (let i = 0; i < 12; i++) {
            buffer.push(i)
        }

        expect(buffer.get(0)).toBe(11)
        expect(buffer.get(9)).toBe(2)
    })
})
