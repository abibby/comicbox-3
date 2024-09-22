import { bind } from '@zwzn/spicy'
import { Fragment, FunctionalComponent, h } from 'preact'
import styles from 'src/components/modal.module.css'
import { useModal } from 'src/components/modal-controller'
import classNames from 'src/classnames'

export const Modal: FunctionalComponent = props => {
    const modal = useModal()
    return (
        <Fragment>
            <div
                class={classNames(styles.screen, {
                    [styles.closing]: modal.closing,
                })}
                onClick={bind(undefined, modal.close)}
            />
            <div
                class={classNames(styles.modal, styles.popup, {
                    [styles.closing]: modal.closing,
                })}
            >
                {props.children}
            </div>
        </Fragment>
    )
}

export const ModalHead: FunctionalComponent = props => {
    const { close } = useModal()
    return (
        <h2 class={styles.head}>
            {props.children}
            <button
                class={styles.close}
                type='button'
                onClick={bind(undefined, close)}
            >
                close
            </button>
        </h2>
    )
}

export const ModalBody: FunctionalComponent = props => {
    return <div class={styles.body}>{props.children}</div>
}
export const ModalFoot: FunctionalComponent = props => {
    return <div class={styles.foot}>{props.children}</div>
}
