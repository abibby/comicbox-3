import { Component, Fragment, h } from 'preact'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type ErrorBoundaryProps = {}
export type ErrorBoundaryState = {
    error?: Error
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
        // eslint-disable-next-line no-console
        console.error(error)
        return { error: error }
    }

    render() {
        if (this.state.error) {
            return (
                <Fragment>
                    <pre>
                        {this.state.error.stack ?? String(this.state.error)}
                    </pre>
                    {this.props.children}
                </Fragment>
            )
        }
        return this.props.children
    }
}
