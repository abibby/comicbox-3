import { FunctionalComponent, h } from "preact";
import styles from "./form-element.module.css";

export interface FormElementProps {
    title: string
}

export const FormElement: FunctionalComponent<FormElementProps> = props => {
    return <label class={styles.formElement}>
        <span class={styles.title}>
            {props.title}
        </span>
        {props.children}
    </label>
}