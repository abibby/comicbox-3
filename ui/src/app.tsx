import EventTarget from 'event-target-shim'
import serviceWorkerURL from 'omt:./service-worker.ts'
import { Fragment, h, render } from 'preact'
import AsyncRoute from 'preact-async-route'
import Router from 'preact-router'
import { useRef } from 'preact/hooks'
import { AlertController, clearAlerts } from './components/alert'
import {
    clearContextMenus,
    ContextMenuController,
} from './components/context-menu'
import { clearModals, ModalController } from './components/modal'
import { Shell } from './components/shell'
import { setSW } from './message'
import { Error404 } from './pages/404'
import { routes } from './routes'

function changePage(): void {
    clearAlerts()
    clearContextMenus()
    clearModals()
}

function Main() {
    useRef(new EventTarget())
    return (
        <Fragment>
            <AlertController />
            <ContextMenuController />
            <ModalController />
            <Shell>
                <Router onChange={changePage}>
                    {Object.values(routes).map(r => {
                        return (
                            <AsyncRoute
                                key={r.path}
                                path={r.path}
                                getComponent={r.component}
                            />
                        )
                    })}
                    <Error404 default />
                </Router>
            </Shell>
        </Fragment>
    )
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
render(<Main />, document.getElementById('app')!)

if ('serviceWorker' in navigator && 1 === 0) {
    navigator.serviceWorker
        .register(serviceWorkerURL, { scope: '/' })
        .then(reg => {
            setSW(reg)
        })
        .catch(err => {
            console.error(err)
        })
}
