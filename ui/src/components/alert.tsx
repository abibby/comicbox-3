import { bind } from '@zwzn/spicy';
import { Event, EventTarget } from 'event-target-shim';
import { FunctionalComponent, h } from "preact";
import { useCallback, useEffect, useState } from 'preact/hooks';
import styles from "./alert.module.css";

class OpenEvent<T = unknown> extends Event<"open"> {
    constructor(public props: AlertProps<T>) {
        super('open')
    }
}
class CloseEvent<T = unknown> extends Event<"close"> {
    constructor(
        public id: number,
        public result: T | undefined
    ) {
        super('close')
    }
}

type AlertEvents = {
    open: OpenEvent,
    close: CloseEvent,
    clear: Event
}

const alertsTarget = new EventTarget<AlertEvents, "strict">()

let alertId = 0

export const AlertController: FunctionalComponent = () => {
    const [alerts, setAlerts] = useState<AlertProps[]>([])
    
    const openAlert = useCallback((e: OpenEvent)=>{
        setAlerts(alerts => alerts.concat([e.props]))
    }, [setAlerts])

    const closeAlert = useCallback((e: CloseEvent)=>{
        setAlerts(alerts => alerts.filter(alert=>alert.id !== e.id))
    }, [setAlerts])

    const clearAlert = useCallback(() => {
        setAlerts([])
    }, [setAlerts])

    useEffect(() => {
        alertsTarget.addEventListener('open', openAlert)
        alertsTarget.addEventListener('close', closeAlert)
        alertsTarget.addEventListener('clear', clearAlert)
        return () => {
            alertsTarget.removeEventListener('open', openAlert)
            alertsTarget.removeEventListener('close', closeAlert)
            alertsTarget.removeEventListener('clear', clearAlert)
        }
    }, [setAlerts])

    return <div class={styles.controller}>
        {alerts.map(alert => <Alert {...alert} />)}
    </div>
}

interface AlertProps<T = unknown> {
    id: number
    message: string
    timeout: number
    options: Record<string, T>
}

function Alert<T>(props: AlertProps<T>) {
    const resolve = useCallback((result: T | undefined) => {
        alertsTarget.dispatchEvent(new CloseEvent(props.id, result))
    }, [props.id])
    const buttons = Object
        .entries(props.options)
        .map(([name, result]) => <button class={styles.option} onClick={bind(result, resolve)}>{name}</button>)

    useEffect(() => {        
        if (props.timeout > 0) {
            setTimeout(() => {
                resolve(undefined)
            }, props.timeout);
        }
    })
    return <div class={styles.alert}>
        {props.message}
        <div class={styles.options}>
            {buttons}
        </div>
    </div>
}

export function prompt<T>(message: string, options: Record<string, T>, timeout = 5000): Promise<T | undefined> {
    return new Promise(resolve => {
        const id = alertId
        alertId++

        alertsTarget.dispatchEvent(new OpenEvent<T>({id: id, message: message, options: options, timeout: timeout}))
        const cb = (e: CloseEvent<unknown>) => {
            if (e.id === id) {
                resolve(e.result as T)
                alertsTarget.removeEventListener('close', cb)
            }
        }
        alertsTarget.addEventListener("close", cb)
    })
}

export function clearAlerts(): void {
    alertsTarget.dispatchEvent(new Event('clear'))
}