import { bind } from '@zwzn/spicy'
import { ComponentChild, Fragment, FunctionalComponent, h } from 'preact'
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
                class={classNames(styles.modal, {
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

    let allChildren: ComponentChild[]
    if (!props.children) {
        allChildren = []
    } else if (props.children instanceof Array) {
        allChildren = props.children
    } else {
        allChildren = [props.children]
    }

    const titleChildren = allChildren.filter(c => !isModalHeadActions(c))
    const actionsChildren = allChildren.filter(isModalHeadActions)

    return (
        <Fragment>
            <div class={styles.head}>
                <button
                    class={styles.close}
                    type='button'
                    onClick={bind(undefined, close)}
                >
                    close
                </button>
                {actionsChildren}
                <h2 class={styles.headTitle}>{titleChildren}</h2>
            </div>
            <h2 class={styles.bodyTitle}>{titleChildren}</h2>
        </Fragment>
    )
}

function isModalHeadActions(c: ComponentChild) {
    return (
        typeof c === 'object' &&
        c !== null &&
        'type' in c &&
        c.type === ModalHeadActions
    )
}

export const ModalHeadActions: FunctionalComponent = props => {
    return <div class={styles.headActions}>{props.children}</div>
}

export const ModalBody: FunctionalComponent = props => {
    return <div class={styles.body}>{props.children}</div>
}
// export const ModalFoot: FunctionalComponent = props => {
//     return <div class={styles.foot}>{props.children}</div>
// }
