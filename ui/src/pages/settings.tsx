import { FunctionalComponent, h } from 'preact'
import { useCallback } from 'preact/hooks'
import { logout, userCreateToken } from 'src/api/auth'
import { bookSync } from 'src/api/sync'
import { openToast } from 'src/components/toast'
import { Button } from 'src/components/button'
import { clearDatabase } from 'src/database'
import { useValue } from 'src/hooks/persistent-state'
import state from 'src/state'
import styles from 'src/pages/settings.module.css'
import { RadioButton, RadioButtonGroup } from 'src/components/form/radio-button'
import { useLocation } from 'preact-iso'
import { openModal } from 'src/components/modal-controller'
import { bind } from '@zwzn/spicy'

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

    const redirectURI = location.origin + '/anilist/login'

    /*
     settings

     start scan
     generate user create link
     clear database
     logout
     anilist login

     */
    const theme = useValue(state.theme)
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
            <section>
                <h3>Admin</h3>
                <Button onClick={bookSync}>Scan Library Files</Button>
                {!PUBLIC_USER_CREATE && (
                    <Button onClick={generateToken}>Invite User</Button>
                )}
            </section>
            <section>
                <h3>Anilist</h3>
                <Button
                    href={`https://anilist.co/api/v2/oauth/authorize?client_id=${ANILIST_CLIENT_ID}&redirect_uri=${encodeURIComponent(
                        redirectURI,
                    )}&response_type=code`}
                >
                    Login with AniList
                </Button>
            </section>
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
