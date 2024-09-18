import { bind } from '@zwzn/spicy'
import { FunctionalComponent, h, VNode } from 'preact'
import { useState } from 'preact/hooks'
import classNames from 'src/classnames'
import styles from 'src/components/tab.module.css'

export interface TabContainerProps {
    children: VNode<TabProps>[]
    class?: string
}

export const TabContainer: FunctionalComponent<TabContainerProps> = props => {
    const [activeTab, setActiveTab] = useState(0)
    const tabs = props.children
    return (
        <div class={classNames(styles.tabContainer, props.class)}>
            <div class={styles.tabButtonList}>
                {tabs.map((t, i) => (
                    <button
                        key={i}
                        class={classNames(styles.tabButton, {
                            [styles.active]: i === activeTab,
                        })}
                        type='button'
                        onClick={bind(i, setActiveTab)}
                    >
                        {t.props.title}
                    </button>
                ))}
            </div>
            <div class={styles.body}>{tabs[activeTab]}</div>
        </div>
    )
}

export interface TabProps {
    title: string
}
export const Tab: FunctionalComponent<TabProps> = props => {
    return <div>{props.children}</div>
}
