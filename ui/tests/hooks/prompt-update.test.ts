import { vi, describe, test, expect, beforeEach, Mock } from 'vitest'
import { renderHook, waitFor } from '@testing-library/preact'
import { usePromptUpdate } from 'src/hooks/prompt-update'
import { act } from 'preact/test-utils'
import { openToast } from 'src/components/toast'
import { splitPromise } from 'src/util'
import { afterEach } from 'node:test'

vi.mock('src/components/toast', () => ({
    openToast: vi.fn(() => Promise.resolve()),
}))

const openToastMock = openToast as Mock<typeof openToast>

const getId = (a: { id: unknown }) => a.id
const identity = (a: unknown) => a

describe('usePromptUpdate', () => {
    beforeEach(() => {
        openToastMock.mockReset()
        vi.useFakeTimers()
    })
    afterEach(() => {
        vi.useRealTimers()
    })
    test('opens toast and updates on click', async () => {
        const { promise, resolve } = splitPromise<boolean>()
        openToastMock.mockReturnValue(promise)

        const { result, rerender } = renderHook(
            (array: number[]) => {
                return usePromptUpdate(array, identity)
            },
            { initialProps: [1] },
        )

        expect(result.current).toEqual([1])

        vi.advanceTimersByTime(300)

        await act(() => {
            rerender([12, 2])
        })

        expect(openToastMock).toHaveBeenCalledOnce()

        expect(result.current).toEqual([1])

        resolve(true)
        vi.useRealTimers()

        await waitFor(() => {
            expect(result.current).toEqual([12, 2])
        })
    })

    test("doesn't open tost with no changes", async () => {
        const { result, rerender } = renderHook(
            (array: number[]) => {
                return usePromptUpdate(array, identity)
            },
            { initialProps: [1] },
        )

        expect(result.current).toEqual([1])

        await act(() => {
            rerender([1])
        })

        expect(result.current).toEqual([1])

        expect(openToastMock).toHaveBeenCalledTimes(0)
    })

    test('replaces matching items', async () => {
        const { result, rerender } = renderHook(
            (array: { id: number; value: string }[]) => {
                return usePromptUpdate(array, getId)
            },
            { initialProps: [{ id: 1, value: 'foo' }] },
        )

        expect(result.current).toEqual([{ id: 1, value: 'foo' }])

        vi.advanceTimersByTime(300)

        await act(() => {
            rerender([
                { id: 2, value: 'baz' },
                { id: 1, value: 'bar' },
            ])
        })

        expect(result.current).toEqual([{ id: 1, value: 'bar' }])
        expect(openToastMock).toHaveBeenCalledTimes(1)
    })

    test('dont prompt when keys match', async () => {
        const { result, rerender } = renderHook(
            (array: { id: number; value: string }[]) => {
                return usePromptUpdate(array, getId)
            },
            { initialProps: [{ id: 1, value: 'foo' }] },
        )

        expect(result.current).toEqual([{ id: 1, value: 'foo' }])

        await act(() => {
            rerender([{ id: 1, value: 'bar' }])
        })

        expect(result.current).toEqual([{ id: 1, value: 'bar' }])
        expect(openToastMock).toHaveBeenCalledTimes(0)
    })
})
