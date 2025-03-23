import { vi, describe, test, expect, beforeEach, Mock } from 'vitest'
import { renderHook, waitFor } from '@testing-library/preact'
import { usePromptUpdate } from 'src/hooks/prompt-update'
import { act } from 'preact/test-utils'
import { openToast } from 'src/components/toast'
import { splitPromise } from 'src/util'

vi.mock('src/components/toast', () => ({
    openToast: vi.fn(() => Promise.resolve()),
}))

const openToastMock = openToast as Mock<typeof openToast>

describe('usePromptUpdate', () => {
    beforeEach(() => {
        openToastMock.mockReset()
    })
    test('opens toast and updates on click', async () => {
        const { promise, resolve } = splitPromise<boolean>()
        openToastMock.mockReturnValue(promise)

        const { result, rerender } = renderHook(
            (array: number[]) => {
                return usePromptUpdate(array, (a, b) => a === b)
            },
            { initialProps: [1] },
        )

        expect(result.current).toEqual([1])

        await act(() => {
            rerender([12, 2])
        })

        await waitFor(() => {
            expect(openToastMock).toHaveBeenCalled()
        })

        expect(result.current).toEqual([1])

        resolve(true)

        await waitFor(() => {
            expect(result.current).toEqual([12, 2])
        })

        expect(openToastMock).toHaveBeenCalledOnce()
    })

    test("doesn't open tost with no changes", async () => {
        const { result, rerender } = renderHook(
            (array: number[]) => {
                return usePromptUpdate(array, (a, b) => a === b)
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
})
