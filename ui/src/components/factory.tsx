import { Event, EventTarget } from 'event-target-shim'
import { ComponentType, FunctionalComponent, h } from 'preact'
import { useCallback, useEffect, useState } from 'preact/hooks'

export interface SubComponentProps {
    id: number
    close(result?: unknown): void
}

class OpenEvent<TProps extends SubComponentProps> extends Event<'open'> {
    constructor(public props: TProps) {
        super('open')
    }
}
class CloseEvent<T = unknown> extends Event<'close'> {
    constructor(public id: number, public result: T | undefined) {
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

    // eslint-disable-next-line no-useless-constructor
    public constructor(
        private subComponent: ComponentType<TProps>,
        private className?: string,
    ) {}

    public Controller: FunctionalComponent = () => {
        const [alerts, setAlerts] = useState<TProps[]>([])

        const onOpen = useCallback(
            (e: OpenEvent<TProps>) => {
                setAlerts(alerts => alerts.concat([e.props]))
            },
            [setAlerts],
        )

        const onClose = useCallback(
            (e: CloseEvent) => {
                setAlerts(alerts => alerts.filter(alert => alert.id !== e.id))
            },
            [setAlerts],
        )

        const onClear = useCallback(() => {
            setAlerts([])
        }, [setAlerts])

        useEffect(() => {
            this.target.addEventListener('open', onOpen)
            this.target.addEventListener('close', onClose)
            this.target.addEventListener('clear', onClear)
            return () => {
                this.target.removeEventListener('open', onOpen)
                this.target.removeEventListener('close', onClose)
                this.target.removeEventListener('clear', onClear)
            }
        }, [setAlerts])

        const SubComponents = this.subComponent
        return (
            <div class={this.className}>
                {alerts.map(alert => (
                    <SubComponents {...alert} />
                ))}
            </div>
        )
    }

    public open = <T,>(
        props: Omit<TProps, keyof SubComponentProps>,
    ): Promise<T | undefined> => {
        return new Promise(resolve => {
            const id = this.id
            this.id++

            this.target.dispatchEvent(
                new OpenEvent<TProps>({
                    ...props,
                    id: id,
                    close: (result: unknown) =>
                        this.target.dispatchEvent(new CloseEvent(id, result)),
                } as unknown as TProps),
            )
            const cb = (e: CloseEvent<unknown>) => {
                if (e.id === id) {
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
