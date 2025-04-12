import { h } from 'preact'

import MD from 'preact-markdown'
import classNames from 'src/classnames'
import styles from 'src/components/markdown.module.css'

export interface MarkdownProps {
    children: string
    class?: string
}

export function Markdown(props: MarkdownProps): h.JSX.Element {
    return MD(props.children ?? '', {
        markupOpts: {
            className: classNames(styles.markdown, props.class),
        },
    })
}
