import { createContext, Fragment, h, Provider, RenderableProps } from 'preact'
import { useContext, useEffect, useRef, useState } from 'preact/hooks'
import { LocationHook, LocationProvider, useLocation } from 'preact-iso'
import { Modal, ModalHead } from 'src/components/modal'

const MODAL_QUERY = 'm'

class OpenEvent extends Event {
    constructor(public readonly id: number, public readonly path: string) {
        super('action')
    }
}
class CloseEvent extends Event {
    constructor(public readonly id: number, public readonly value: unknown) {
        super('action')
    }
}

type ModalContext = {
    path: string
    close(value?: unknown): void
    closing: boolean
}

type ModalInfo = {
    id: number
    modal: ModalContext
    location: LocationHook
}

let modalID = 0

const modalContext = createContext<ModalContext>({
    path: '',
    close() {},
    closing: false,
})

const modalBuss = new EventTarget()

export function ModalController({ children }: RenderableProps<unknown>) {
    const loc = useLocation()
    const locRef = useRef(loc)

    const [modals, setModals] = useState<ModalInfo[]>([])

    useEffect(() => {
        locRef.current = loc
    }, [loc])

    useEffect(() => {
        const action = (e: Event) => {
            if (e instanceof OpenEvent) {
                const url = e.path
                const u = new URL(url, location.origin)
                const path = u.pathname.replace(/\/$/g, '')
                setModals(m =>
                    m.concat([
                        {
                            id: e.id,
                            modal: {
                                path: e.path,
                                close: value =>
                                    modalBuss.dispatchEvent(
                                        new CloseEvent(e.id, value),
                                    ),
                                closing: false,
                            },
                            location: {
                                ...locRef.current,
                                url,
                                path,
                                query: Object.fromEntries(u.searchParams),
                            },
                        },
                    ]),
                )
            } else if (e instanceof CloseEvent) {
                setModals(m =>
                    m.map(m => {
                        if (m.id !== e.id) {
                            return m
                        }
                        return {
                            ...m,
                            modal: {
                                ...m.modal,
                                closing: true,
                            },
                        }
                    }),
                )

                setTimeout(() => {
                    setModals(m => {
                        const url = new URL(location.href)
                        url.searchParams.getAll(MODAL_QUERY)
                        url.searchParams.delete(MODAL_QUERY)
                        const final = m.filter(m => m.id !== e.id)
                        for (const m of final) {
                            url.searchParams.append(MODAL_QUERY, m.modal.path)
                        }
                        history.replaceState(null, '', url.href)
                        return final
                    })
                }, 250)
            }
        }

        modalBuss.addEventListener('action', action)
        return () => {
            modalBuss.removeEventListener('action', action)
        }
    }, [])

    useEffect(() => {
        const url = new URL(location.href)
        const paths = url.searchParams.getAll(MODAL_QUERY)
        for (const path of paths) {
            void openModalWithoutPath(path)
        }
    }, [])

    const ModifiedLocationProvider: Provider<LocationHook> =
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        LocationProvider.ctx.Provider

    const Provider = modalContext.Provider
    return (
        <Fragment>
            {modals.map(value => (
                <ModifiedLocationProvider key={value.id} value={value.location}>
                    <Provider value={value.modal}>{children}</Provider>
                </ModifiedLocationProvider>
            ))}
        </Fragment>
    )
}

export function useModal(): ModalContext {
    return useContext(modalContext)
}

export function openModal(uri: string) {
    const url = new URL(location.href)
    url.searchParams.append(MODAL_QUERY, uri)
    history.replaceState(null, '', url.href)
    return openModalWithoutPath(uri)
}
function openModalWithoutPath(uri: string) {
    const id = modalID++
    modalBuss.dispatchEvent(new OpenEvent(id, uri))
    let resultPromise: Promise<unknown> | undefined
    return {
        result: () => {
            if (!resultPromise) {
                resultPromise = new Promise(resolve => {
                    const action = (e: Event) => {
                        if (e instanceof CloseEvent) {
                            if (e.id === id) {
                                modalBuss.removeEventListener('action', action)
                                resolve(e.value)
                            }
                        }
                    }
                    modalBuss.addEventListener('action', action)
                })
            }
            return resultPromise
        },
        close: (value?: unknown) => dispatchEvent(new CloseEvent(id, value)),
    }
}

export function DefaultModal() {
    return (
        <Modal>
            <ModalHead>Not Found</ModalHead>
        </Modal>
    )
}
