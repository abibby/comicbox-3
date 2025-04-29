import { h } from 'preact'
import { Lock, Unlock } from 'preact-feather'
import styles from 'src/components/form/locker.module.css'

export type LockerProps = {
    name: string
    locked: string[] | undefined
}

export function Locker({ name, locked }: LockerProps) {
    const checked = locked?.includes(name)

    return (
        <label class={styles.locker}>
            <input
                type='checkbox'
                name='locked_fields'
                value={name}
                checked={checked}
            />
            <Lock class={styles.lock} />
            <Unlock class={styles.unlock} />
        </label>
    )
}
