import { FunctionalComponent, h } from 'preact'
import { useMemo } from 'preact/hooks'

export const Error404: FunctionalComponent = () => {
    return (
        <div>
            <h1>404 Not Found</h1>
        </div>
    )
}

export interface Error500Props {
    error: unknown
}

export const Error500: FunctionalComponent<Error500Props> = ({ error }) => {
    return (
        <div>
            <h1>Error</h1>
            {String(error)}
        </div>
    )
}
