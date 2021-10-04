import { FunctionalComponent, h } from "preact";
import styles from "./shell.module.css";

export const Shell: FunctionalComponent = props => {
    return <div class={styles.shell}><nav class={styles.nope}>menu</nav>{props.children}</div>
}