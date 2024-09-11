import { FunctionalComponent, h } from 'preact'
import { useCallback, useState } from 'preact/hooks'
import { logout, userCreateToken } from 'src/api/auth'
import { bookSync } from 'src/api/sync'
import { openToast } from 'src/components/toast'
import { Button, ButtonGroup } from 'src/components/button'
import { clearDatabase } from 'src/database'
import {
    Modal,
    ModalBody,
    ModalFoot,
    ModalHead,
    openModal,
} from 'src/components/modal'
import { Input } from 'src/components/form/input'
import { Form } from 'src/components/form/form'
import { Errors } from 'src/components/form/form-element'
import { useValue } from 'src/hooks/persistent-state'
import state from 'src/state'
import styles from 'src/pages/settings.module.css'
import { RadioButton, RadioButtonGroup } from 'src/components/form/radio-button'
import { useLocation } from 'preact-iso'

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

async function changePassword() {
    await openModal(({ close }) => {
        const [oldPassword, setOldPassword] = useState('')
        const [newPassword1, setNewPassword1] = useState('')
        const [newPassword2, setNewPassword2] = useState('')

        const [errors, setErrors] = useState<Errors>({})

        const save = useCallback(() => {
            if (newPassword1 !== newPassword2) {
                setErrors({ new_password_2: ['passwords do not match'] })
                return
            }
            setErrors({})
        }, [newPassword1, newPassword2])
        return (
            <Modal>
                <Form onSubmit={save}>
                    <ModalHead close={close}>Change Password</ModalHead>
                    <ModalBody>
                        <Input
                            title='Old Password'
                            name='old_password'
                            type='password'
                            value={oldPassword}
                            onInput={setOldPassword}
                            errors={errors}
                        />
                        <Input
                            title='New Password'
                            name='new_password_1'
                            type='password'
                            value={newPassword1}
                            onInput={setNewPassword1}
                            errors={errors}
                        />
                        <Input
                            title='Repeat New Password'
                            name='new_password_2'
                            type='password'
                            value={newPassword2}
                            onInput={setNewPassword2}
                            errors={errors}
                        />
                    </ModalBody>
                    <ModalFoot>
                        <ButtonGroup>
                            <Button type='submit'>Save</Button>
                        </ButtonGroup>
                    </ModalFoot>
                </Form>
            </Modal>
        )
    }, {})
}
async function changeName() {}
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
                <Button onClick={changePassword}>Change Password</Button>
                <Button onClick={changeName}>Change Name</Button>
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
                <Button onClick={clearDatabase}>Clear Database</Button>
            </section>
            <section>
                <h3>Admin</h3>
                <Button onClick={bookSync}>Start Scan</Button>
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
