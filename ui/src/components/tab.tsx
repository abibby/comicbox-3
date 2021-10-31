import { bind } from '@zwzn/spicy'
import { FunctionalComponent, h, VNode } from 'preact'
import { useState } from 'preact/hooks'

export interface TabContainerProps {
    children: VNode<TabProps>[]
}

export const TabContainer: FunctionalComponent<TabContainerProps> = props => {
    const [activeTab, setActiveTab] = useState(0)
    const tabs = props.children
    return (
        <div>
            <div>
                {tabs.map((t, i) => (
                    <button type='button' onClick={bind(i, setActiveTab)}>
                        {t.props.title}
                    </button>
                ))}
            </div>
            {tabs[activeTab]}
        </div>
    )
}

export interface TabProps {
    title: string
}
export const Tab: FunctionalComponent<TabProps> = props => {
    return <div>{props.children}</div>
}
