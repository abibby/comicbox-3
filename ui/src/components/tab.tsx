import { bind } from '@zwzn/spicy'
import { createContext, FunctionalComponent, h, VNode } from 'preact'
import { useContext, useMemo, useState } from 'preact/hooks'
import classNames from 'src/classnames'
import styles from 'src/components/tab.module.css'

type TabContext = {
    activeTabTitle: string
}

const TabContext = createContext<TabContext>({ activeTabTitle: '' })

export interface TabContainerProps {
    children: VNode<TabProps>[]
    class?: string
}

export const TabContainer: FunctionalComponent<TabContainerProps> = props => {
    const [activeTab, setActiveTab] = useState(0)
    const tabs = props.children
    const ctx = useMemo(
        (): TabContext => ({
            activeTabTitle: tabs[activeTab]?.props.title ?? '',
        }),
        [activeTab, tabs],
    )

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
            <TabContext.Provider value={ctx}>{tabs}</TabContext.Provider>
        </div>
    )
}

export interface TabProps {
    title: string
    class?: string
}
export const Tab: FunctionalComponent<TabProps> = props => {
    const ctx = useContext(TabContext)
    return (
        <div
            class={classNames(styles.body, props.class, {
                [styles.active]: ctx.activeTabTitle === props.title,
            })}
        >
            {props.children}
        </div>
    )
}
