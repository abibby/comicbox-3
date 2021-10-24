import { bind } from '@zwzn/spicy'
import { ComponentType, FunctionalComponent, h } from 'preact'
import { Factory, SubComponentProps } from './factory'
import styles from './modal.module.css'

export type ModalComponent<
    T,
    TProps extends Record<string, unknown>,
> = ComponentType<TProps & { close(value: T): void }>

interface ModalProps<T, TProps extends Record<string, unknown>>
    extends SubComponentProps {
    body: ModalComponent<T, TProps>
    props: TProps
}

function Popup<T, TProps extends Record<string, unknown>>(
    props: ModalProps<T, TProps>,
) {
    const Body = props.body
    return (
        <div>
            <div class={styles.screen} onClick={bind(undefined, props.close)} />
            <div class={styles.popup}>
                <Body {...props.props} close={props.close} />
            </div>
        </div>
    )
}

const modals = new Factory<ModalProps<any, any>>(Popup)

export const ModalController = modals.Controller

export async function openModal<T, TProps extends Record<string, unknown>>(
    body: ModalComponent<T, TProps>,
    props: TProps,
): Promise<T | undefined> {
    return modals.open<T>({
        body: body,
        props: props,
    })
}

export function clearModals(): void {
    modals.clear()
}

export const Modal: FunctionalComponent = props => {
    return <div class={styles.modal}>{props.children}</div>
}

export const ModalHead: FunctionalComponent = props => {
    return <h2 class={styles.head}>{props.children}</h2>
}

export const ModalBody: FunctionalComponent = props => {
    return <div class={styles.body}>{props.children}</div>
}
