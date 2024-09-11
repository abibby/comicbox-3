import EventTarget from 'event-target-shim'
import { Fragment, h, render } from 'preact'
import { useRef } from 'preact/hooks'
import { ToastController, clearToasts } from 'src/components/toast'
import {
    clearContextMenus,
    ContextMenuController,
} from 'src/components/context-menu'
import { clearModals, ModalController } from 'src/components/modal'
import { Shell } from 'src/components/shell'
import { Error404 } from 'src/pages/errors'
import { routes } from 'src/routes'
import { initServiceWorker } from 'src/init-service-worker'
import 'src/error'
import state from 'src/state'
import { LocationProvider, ErrorBoundary, Router, Route } from 'preact-iso'

function changePage(): void {
    clearToasts()
    clearContextMenus()
    clearModals()
}

function Main() {
    useRef(new EventTarget())
    return (
        <Fragment>
            <ToastController />
            <ContextMenuController />
            <ModalController />
            <LocationProvider>
                <ErrorBoundary>
                    <Shell>
                        <Router onRouteChange={changePage}>
                            {Object.values(routes)
                                .map(r => (
                                    <Route
                                        key={r.path}
                                        path={r.path}
                                        component={r.component}
                                    />
                                ))
                                .concat(<Error404 default />)}
                        </Router>
                    </Shell>
                </ErrorBoundary>
            </LocationProvider>
        </Fragment>
    )
}

state.theme.addEventListener('change', () => {
    document.documentElement.classList.remove('light')
    document.documentElement.classList.remove('dark')
    if (state.theme.value) {
        document.documentElement.classList.add(state.theme.value)
    }
})

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
render(<Main />, document.getElementById('app')!)

initServiceWorker()

if ('virtualKeyboard' in navigator) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(navigator as any).virtualKeyboard.overlaysContent = true
}
