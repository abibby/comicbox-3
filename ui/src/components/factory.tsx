import { Event, EventTarget } from 'event-target-shim'
import { ComponentType, Fragment, FunctionalComponent, h } from 'preact'
import { useCallback, useEffect, useState } from 'preact/hooks'

export interface SubComponentProps {
    id: number | string
    close(result?: unknown): void
}

class OpenEvent<TProps extends SubComponentProps> extends Event<'open'> {
    constructor(public props: TProps) {
        super('open')
    }
}
class CloseEvent<T = unknown> extends Event<'close'> {
    constructor(public id: number | string, public result: T | undefined) {
        super('close')
    }
}

type EventMap<TProps extends SubComponentProps> = {
    open: OpenEvent<TProps>
    close: CloseEvent
    clear: Event
}

export class Factory<
    TProps extends SubComponentProps = SubComponentProps,
> extends EventTarget<EventMap<TProps>, 'strict'> {
    private id = 0

    public constructor(
        private subComponent: ComponentType<TProps>,
        private onUpdate?: (state: TProps[]) => void,
    ) {
        super()
    }

    public Controller: FunctionalComponent = () => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [alerts, setAlerts] = useState(new Map<string | number, TProps>())

        // eslint-disable-next-line react-hooks/rules-of-hooks
        const setAlerts2 = useCallback(
            (
                value: (
                    previousState: Map<string | number, TProps>,
                ) => Map<string | number, TProps>,
            ) => {
                setAlerts(pState => {
                    const state = value(pState)
                    this.onUpdate?.([...state.values()])
                    return state
                })
            },
            [setAlerts],
        )

        // eslint-disable-next-line react-hooks/rules-of-hooks
        const onOpen = useCallback(
            (e: OpenEvent<TProps>) => {
                setAlerts2(alerts => {
                    const n = new Map(alerts)
                    n.set(e.props.id, e.props)
                    return n
                })
            },
            [setAlerts2],
        )

        // eslint-disable-next-line react-hooks/rules-of-hooks
        const onClose = useCallback(
            (e: CloseEvent) => {
                setAlerts2(alerts => {
                    const n = new Map(alerts)
                    n.delete(e.id)
                    return n
                })
            },
            [setAlerts2],
        )

        // eslint-disable-next-line react-hooks/rules-of-hooks
        const onClear = useCallback(() => {
            setAlerts2(() => new Map())
        }, [setAlerts2])

        // eslint-disable-next-line react-hooks/rules-of-hooks
        useEffect(() => {
            this.addEventListener('open', onOpen)
            this.addEventListener('close', onClose)
            this.addEventListener('clear', onClear)
            return () => {
                this.removeEventListener('open', onOpen)
                this.removeEventListener('close', onClose)
                this.removeEventListener('clear', onClear)
            }
        }, [onClear, onClose, onOpen])

        const SubComponents = this.subComponent
        return (
            <Fragment>
                {Array.from(alerts).map(([key, alert]) => (
                    <SubComponents key={key} {...alert} />
                ))}
            </Fragment>
        )
    }

    public open = <T,>(
        props: Omit<TProps, keyof SubComponentProps>,
        id?: string,
    ): Promise<T | undefined> => {
        return new Promise(resolve => {
            if (id === undefined) {
                this.id++
            }

            const id2 = id ?? this.id

            this.dispatchEvent(
                new OpenEvent<TProps>({
                    ...props,
                    id: id2,
                    close: (result: unknown) =>
                        this.dispatchEvent(new CloseEvent(id2, result)),
                } as unknown as TProps),
            )
            const cb = (e: CloseEvent<unknown>) => {
                if (e.id === id2) {
                    resolve(e.result as T)
                    this.removeEventListener('close', cb)
                }
            }
            this.addEventListener('close', cb)
        })
    }

    public clear = (): void => {
        this.dispatchEvent(new Event('clear'))
    }
}
