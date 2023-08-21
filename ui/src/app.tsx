import EventTarget from 'event-target-shim'
import { get, set } from 'idb-keyval'
import serviceWorkerURL from 'omt:src/service-worker/sw'
import { Fragment, h, render } from 'preact'
import AsyncRoute from 'preact-async-route'
import Router from 'preact-router'
import { useRef } from 'preact/hooks'
import { AlertController, clearAlerts, prompt } from 'src/components/alert'
import {
    clearContextMenus,
    ContextMenuController,
} from 'src/components/context-menu'
import { clearModals, ModalController } from 'src/components/modal'
import { Shell } from 'src/components/shell'
import { setSW } from 'src/message'
import { Error404 } from 'src/pages/404'
import { routes } from 'src/routes'

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

async function installingWorker(
    reg: ServiceWorkerRegistration,
): Promise<ServiceWorker> {
    if (reg.installing) return reg.installing
    return new Promise<ServiceWorker>(resolve => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        reg.addEventListener('updatefound', () => resolve(reg.installing!), {
            once: true,
        })
    })
}

let reloading = false
async function onUpdateFound(
    registration: ServiceWorkerRegistration,
): Promise<void> {
    const worker = await installingWorker(registration)

    worker.addEventListener('statechange', async () => {
        if (reloading) return

        // the very first activation!
        // tell the user stuff works offline
        if (
            worker.state === 'activated' &&
            !navigator.serviceWorker.controller
        ) {
            await prompt('Ready to work offline', {}, 5000)
            return
        }

        if (
            worker.state === 'activated' &&
            navigator.serviceWorker.controller
        ) {
            // otherwise, show the user an alert
            const answer = await prompt(
                'Update available',
                {
                    reload: 'reload',
                    dismiss: 'dismiss',
                },
                5000,
            )

            if (answer === 'reload') {
                reloading = true
                location.reload()
            }
        }
    })
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker
        .register(serviceWorkerURL, { scope: '/' })
        .then(reg => {
            onUpdateFound(reg)
            setSW(reg)
        })
        .catch(err => {
            console.error(err)
        })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(window as any).__TEST_UTILS__ = {
    getTokens: () => get('tokens'),
    setTokens: (tokens: unknown) => set('tokens', tokens),
}
