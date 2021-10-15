import { bind } from '@zwzn/spicy';
import { ComponentType, FunctionalComponent, h } from "preact";
import { Factory, SubComponentProps } from './factory';
import styles from "./modal.module.css";

export type ModalComponent<T> = ComponentType<{ close(value: T): void }>

interface ModalProps<T = unknown> extends SubComponentProps {
    title: string
    body: ModalComponent<T>
}

function Popup<T>(props: ModalProps<T>) {
    const Body = props.body
    return <div>
        <div class={styles.screen} onClick={bind(undefined, props.close)} />
        <div class={styles.popup}>
            <Body close={props.close} />
        </div>
    </div>
}

const modals = new Factory(Popup)

export const ModalController = modals.Controller

export async function openModal<T>(title:string, body: ComponentType<{ close(value: T): void }>): Promise<T | undefined> {    
    return modals.open<T>({
        title: title,
        body: body
    })
}

export function clearModals(): void {
    modals.clear()
}

export const Modal: FunctionalComponent = props => {
    return <div class={styles.modal}>
        {props.children}
    </div>
}

export const ModalHead: FunctionalComponent = props => {
    return <h2 class={styles.head}>
        {props.children}
    </h2>
}

export const ModalBody: FunctionalComponent = props => {
    return <div class={styles.body}>
        {props.children}
    </div>
}

