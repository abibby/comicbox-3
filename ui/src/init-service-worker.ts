import { sleep } from 'helpers/sleep'
import { openToast } from 'src/components/toast'
import { Message, post } from 'src/message'
import slog from 'src/slog'

export function initServiceWorker() {
    let reloading = false

    async function openUpdatePrompt(registration: ServiceWorkerRegistration) {
        await sleep(500)
        const promptKey = 'update'
        // otherwise, show the user an alert
        const doUpdate = await openToast(
            'Update available',
            {
                update: true,
                dismiss: false,
            },
            -1,
            promptKey,
        )

        if (doUpdate) {
            reloading = true
            if (registration.waiting) {
                const m: Message = { type: 'skip-waiting' }
                registration.waiting.postMessage(m)
                await openToast('Updating', {}, -1, promptKey)
            } else {
                await openToast('Could not finish update', {}, 5000, promptKey)
            }
        }
    }

    async function initializeRegistration(
        registration: ServiceWorkerRegistration,
    ): Promise<void> {
        if (registration.waiting) {
            await openUpdatePrompt(registration)
        }

        registration.addEventListener('updatefound', async () => {
            if (registration.installing) {
                registration.installing.addEventListener(
                    'statechange',
                    async () => {
                        // the very first activation!
                        // tell the user stuff works offline
                        if (
                            registration.installing?.state === 'activated' &&
                            !navigator.serviceWorker.controller
                        ) {
                            await openToast('Ready to work offline')
                            return
                        }
                        if (registration.active && !reloading) {
                            await openUpdatePrompt(registration)
                        }
                    },
                )
            }
        })
    }

    if (
        'serviceWorker' in navigator &&
        import.meta.env.MODE !== 'development'
    ) {
        navigator.serviceWorker
            .register('/sw.js', { scope: '/', type: 'module' })
            .then(initializeRegistration)
            .catch(err => {
                slog.Warn('service worker registration failed', { err: err })
            })

        navigator.serviceWorker.addEventListener('message', e => {
            const message: Message = e.data

            switch (message.type) {
                case 'reload':
                    location.reload()
            }
        })

        void post({ type: 'check-update' })
    }
}
