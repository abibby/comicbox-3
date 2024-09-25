import { Component, h } from 'preact'

export class ErrorBoundary extends Component<{}, { error?: unknown }> {
    constructor(props: {}) {
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
