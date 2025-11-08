import { FunctionalComponent, h } from 'preact'
import { useCallback } from 'preact/hooks'
import { logout, useHasScope, userCreateToken } from 'src/api/auth'
import { bookSync } from 'src/api/sync'
import { openToast } from 'src/components/toast'
import { Button } from 'src/components/button'
import { clearDatabase } from 'src/database'
import { useSignal } from 'src/hooks/signals'
import state from 'src/state'
import styles from 'src/pages/settings.module.css'
import { RadioButton, RadioButtonGroup } from 'src/components/form/radio-button'
import { useLocation } from 'preact-iso'
import { openModal } from 'src/components/modal-controller'
import { bind } from '@zwzn/spicy'
import { metadataSync } from 'src/api/metadata'

function useLogoutAndRoute() {
    const { route } = useLocation()
    return useCallback(async () => {
        const accepted = await openToast(
            'Logging out will remove all local storage. Are you sure?',
            {
                no: false,
                yes: true,
            },
        )
        if (accepted) {
            await logout()
            route('/login')
        }
    }, [route])
}

export const Settings: FunctionalComponent = () => {
    const generateToken = useCallback(async () => {
        const token = await userCreateToken()
        await openToast(
            `${location.origin}/users/create?_token=${token}`,
            {},
            -1,
        )
    }, [])

    // const redirectURI = location.origin + '/anilist/login'

    const scopeBookSync = useHasScope('book:sync')
    const scopeSeriesWrite = useHasScope('series:write')
    const scopeAdmin = useHasScope('series:write')

    /*
     settings

     start scan
     generate user create link
     clear database
     logout
     anilist login

     */
    const theme = useSignal(state.theme)
    const logoutAndRoute = useLogoutAndRoute()
    return (
        <div class={styles.settings}>
            <section>
                <h3>Account</h3>
                <Button onClick={bind('/change-password', openModal)}>
                    Change Password
                </Button>
                <Button onClick={logoutAndRoute}>Logout</Button>
            </section>

            <section>
                <h3>Device Settings</h3>
                <RadioButtonGroup
                    name='theme'
                    value={theme ?? ''}
                    onInput={setTheme}
                >
                    <RadioButton value=''>System</RadioButton>
                    <RadioButton value='light'>Light</RadioButton>
                    <RadioButton value='dark'>Dark</RadioButton>
                </RadioButtonGroup>
                <Button onClick={clearDatabase}>Clear Local Cache</Button>
            </section>
            {(scopeBookSync ||
                scopeSeriesWrite ||
                (!PUBLIC_USER_CREATE && scopeAdmin)) && (
                <section>
                    <h3>Admin</h3>
                    {scopeBookSync && (
                        <Button onClick={bookSync}>Scan Library Files</Button>
                    )}
                    {scopeSeriesWrite && (
                        <Button onClick={metadataSync}>
                            Update Series Metadata
                        </Button>
                    )}
                    {!PUBLIC_USER_CREATE && scopeAdmin && (
                        <Button onClick={generateToken}>Invite User</Button>
                    )}
                    {scopeAdmin && (
                        <Button onClick={bind(`/user`, openModal)}>
                            View Users
                        </Button>
                    )}
                    <div class={styles.buildVersion}>
                        ComicBox {BUILD_VERSION}
                    </div>
                </section>
            )}
        </div>
    )
}

function setTheme(theme: string) {
    if (theme === 'light' || theme === 'dark') {
        state.theme.value = theme
    } else {
        state.theme.value = null
    }
}
