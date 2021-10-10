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
    close: CloseEvent
}

const alertsTarget = new EventTarget<AlertEvents, "strict">()

let alertId = 0

export const AlertController: FunctionalComponent = props => {
    const [alerts, setAlerts] = useState<AlertProps[]>([])
    const openAlert = useCallback((e: OpenEvent)=>{
        setAlerts(alerts => alerts.concat([e.props]))
    }, [setAlerts])
    const closeAlert = useCallback((e: CloseEvent)=>{
        setAlerts(alerts => alerts.filter(alert=>alert.id !== e.id))
    }, [setAlerts])
    useEffect(() => {
        alertsTarget.addEventListener('open', openAlert)
        alertsTarget.addEventListener('close', closeAlert)
        return () => {
            alertsTarget.removeEventListener('open', openAlert)
            alertsTarget.removeEventListener('close', closeAlert)
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

export function prompt<T>(message: string, options: Record<string, T>, timeout: number = 5000): Promise<T | undefined> {
    return new Promise(resolve => {
        const id = alertId
        alertId++

        alertsTarget.dispatchEvent(new OpenEvent<T>({id, message, options, timeout}))
        const cb = (e: CloseEvent<T>) => {
            if (e.id === id) {
                resolve(e.result)
                alertsTarget.removeEventListener('close', cb as any)
            }
        }
        alertsTarget.addEventListener("close", cb as any)
    })
}
