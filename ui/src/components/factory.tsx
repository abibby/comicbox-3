import { Event, EventTarget } from 'event-target-shim'
import { ComponentType, FunctionalComponent, h } from 'preact'
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

export class Factory<TProps extends SubComponentProps = SubComponentProps> {
    private target = new EventTarget<EventMap<TProps>, 'strict'>()
    private id = 0

    public constructor(
        private subComponent: ComponentType<TProps>,
        private className?: string,
        private onUpdate?: (state: TProps[]) => void,
    ) {}

    public Controller: FunctionalComponent = () => {
        const [alerts, setAlerts] = useState(new Map<string | number, TProps>())

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

        const onClear = useCallback(() => {
            setAlerts2(() => new Map())
        }, [setAlerts2])

        useEffect(() => {
            this.target.addEventListener('open', onOpen)
            this.target.addEventListener('close', onClose)
            this.target.addEventListener('clear', onClear)
            return () => {
                this.target.removeEventListener('open', onOpen)
                this.target.removeEventListener('close', onClose)
                this.target.removeEventListener('clear', onClear)
            }
        }, [onClear, onClose, onOpen])

        const SubComponents = this.subComponent
        return (
            <div class={this.className}>
                {Array.from(alerts).map(([key, alert]) => (
                    <SubComponents key={key} {...alert} />
                ))}
            </div>
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

            this.target.dispatchEvent(
                new OpenEvent<TProps>({
                    ...props,
                    id: id2,
                    close: (result: unknown) =>
                        this.target.dispatchEvent(new CloseEvent(id2, result)),
                } as unknown as TProps),
            )
            const cb = (e: CloseEvent<unknown>) => {
                if (e.id === id2) {
                    resolve(e.result as T)
                    this.target.removeEventListener('close', cb)
                }
            }
            this.target.addEventListener('close', cb)
        })
    }

    public clear = (): void => {
        this.target.dispatchEvent(new Event('clear'))
    }
}
