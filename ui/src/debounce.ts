export type DebouncedFunction<TArgs extends unknown[], TReturn, TThis> = {
    (this: TThis, ...args: TArgs): TReturn
    clear(): void
    flush(): void
}

/**
 * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds. If `immediate` is passed, trigger the function on the
 * leading edge, instead of the trailing. The function also has a property 'clear'
 * that is a function which will clear the timer to prevent previously scheduled executions.
 *
 * @source underscore.js
 * @see http://unscriptable.com/2009/03/20/debouncing-javascript-methods/
 * @param function to wrap
 * @param timeout in ms (`100`)
 * @param whether to execute at the beginning (`false`)
 * @api public
 */
export function debounce<TArgs extends unknown[], TReturn, TThis>(
    func: (this: TThis, ...args: TArgs) => TReturn,
    wait = 100,
    immediate = false,
): DebouncedFunction<TArgs, TReturn, TThis> {
    let timeout: NodeJS.Timeout | null
    let args: TArgs | null
    let context: TThis | null
    let timestamp: number
    let result: TReturn

    function later() {
        const last = Date.now() - timestamp

        if (last < wait && last >= 0) {
            timeout = setTimeout(later, wait - last)
        } else {
            timeout = null
            if (!immediate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                result = func.apply(context!, args!)
                context = args = null
            }
        }
    }

    function debounced(this: TThis, ...a: TArgs) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        context = this
        args = a
        timestamp = Date.now()
        const callNow = immediate && !timeout
        if (!timeout) timeout = setTimeout(later, wait)
        if (callNow) {
            result = func.apply(context, args)
            context = null
            args = null
        }

        return result
    }

    debounced.clear = function () {
        if (timeout) {
            clearTimeout(timeout)
            timeout = null
        }
    }

    debounced.flush = function () {
        if (timeout) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            result = func.apply(context!, args!)
            context = args = null

            clearTimeout(timeout)
            timeout = null
        }
    }

    return debounced as DebouncedFunction<TArgs, TReturn, TThis>
}
