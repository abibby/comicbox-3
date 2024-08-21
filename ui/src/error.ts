import slog from 'src/slog'

async function handleError(err: unknown): Promise<void> {
    slog.Error('runtime error', { err: err })
}

window.addEventListener('error', e => {
    void handleError(e.error)
})
window.addEventListener('unhandledrejection', e => {
    void handleError(e.reason)
})
