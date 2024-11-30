import { bind } from '@zwzn/spicy'
import { h } from 'preact'
import { useEffect } from 'preact/hooks'
import styles from 'src/components/toast.module.css'
import { Factory, SubComponentProps } from 'src/components/factory'

interface ToastProps<T = unknown> extends SubComponentProps {
    message: string
    timeout: number
    options: Record<string, T>
}

function Toast<T>(props: ToastProps<T>) {
    const buttons = Object.entries(props.options)
        .map(([name, result]) => (
            <button
                key={name}
                class={styles.option}
                onClick={bind(result, props.close)}
            >
                {name}
            </button>
        ))
        .reverse()

    const { timeout, close } = props
    useEffect(() => {
        if (timeout > 0) {
            setTimeout(() => {
                close()
            }, timeout)
        }
    }, [close, timeout])
    return (
        <div class={styles.alert} onClick={close}>
            {props.message}
            <div class={styles.options}>{buttons}</div>
        </div>
    )
}

const toasts = new Factory(Toast)

export function ToastController() {
    const Controller = toasts.Controller
    return (
        <div class={styles.controller}>
            <Controller />
        </div>
    )
}

export async function openToast<T>(
    message: string,
    options: Record<string, T> = {},
    timeout = 5000,
    key?: string,
): Promise<T | undefined> {
    return toasts.open<T>(
        {
            message: message,
            options: options,
            timeout: timeout,
        },
        key,
    )
}

export function clearToasts(): void {
    toasts.clear()
}
