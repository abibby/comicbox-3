import { Component, h } from 'preact'

export type ErrorBoundaryProps = Record<string, never>
export type ErrorBoundaryState = {
    error?: unknown
}

export class ErrorBoundary extends Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = {}
    }

    static override getDerivedStateFromError(error: unknown) {
        return { error: error }
    }

    render() {
        if (this.state.error) {
            return <pre>{String(this.state.error)}</pre>
        }
        return this.props.children
    }
}
