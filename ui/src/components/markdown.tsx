import { h } from 'preact'
import styles from 'src/components/markdown.module.css'
import { marked } from 'marked'
import { useMemo } from 'preact/hooks'

export interface MarkdownProps {
    children: string
    class?: string
}

export function Markdown(props: MarkdownProps): h.JSX.Element {
    const markup = useMemo(
        () => marked(props.children, { async: false }),
        [props.children],
    )

    return (
        <div
            dangerouslySetInnerHTML={{ __html: markup }}
            class={styles.markdown + ' ' + props.class}
        />
    )
}
