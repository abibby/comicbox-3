import { bind } from '@zwzn/spicy'
import { h } from 'preact'
import { useEffect } from 'preact/hooks'
import styles from './alert.module.css'
import { Factory, SubComponentProps } from './factory'

interface AlertProps<T = unknown> extends SubComponentProps {
    message: string
    timeout: number
    options: Record<string, T>
}

function Alert<T>(props: AlertProps<T>) {
    const buttons = Object.entries(props.options).map(([name, result]) => (
        <button class={styles.option} onClick={bind(result, props.close)}>
            {name}
        </button>
    ))

    useEffect(() => {
        if (props.timeout > 0) {
            setTimeout(() => {
                props.close()
            }, props.timeout)
        }
    })
    return (
        <div class={styles.alert}>
            {props.message}
            <div class={styles.options}>{buttons}</div>
        </div>
    )
}

const alerts = new Factory(Alert, styles.controller)

export const AlertController = alerts.Controller

export async function prompt<T>(
    message: string,
    options: Record<string, T>,
    timeout = 5000,
): Promise<T | undefined> {
    return alerts.open<T>({
        message: message,
        options: options,
        timeout: timeout,
    })
}

export function clearAlerts(): void {
    alerts.clear()
}
