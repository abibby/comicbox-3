import { FunctionalComponent, h } from 'preact'
import { useCallback } from 'preact/hooks'
import { authAPI, FetchError } from 'src/api'
import { openToast } from 'src/components/toast'
import { Button, ButtonGroup } from 'src/components/button'
import { Data, Form } from 'src/components/form/form'
import { Input } from 'src/components/form/input'
import styles from 'src/pages/login.module.css'
import { useLocation } from 'preact-iso'
import { route } from 'src/routes'

export const Login: FunctionalComponent = () => {
    const { route: navigate } = useLocation()
    const submit = useCallback(
        async (data: Data) => {
            try {
                await authAPI.login({
                    username: data.get('username') ?? '',
                    password: data.get('password') ?? '',
                })

                navigate('/')
            } catch (e) {
                if (e instanceof FetchError) {
                    if (e.status === 401) {
                        await openToast(
                            'invalid username or password',
                            {},
                            5000,
                        )
                        return
                    }
                }
                await openToast('error logging in')
            }
        },
        [navigate],
    )

    return (
        <div class={styles.login}>
            <div class={styles.form}>
                <h1>ComicBox</h1>
                <Form onSubmit={submit}>
                    <Input title='Username' name='username' focused />
                    <Input title='Password' type='password' name='password' />
                    <ButtonGroup>
                        <Button type='submit' color='primary'>
                            Login
                        </Button>
                        {PUBLIC_USER_CREATE && (
                            <Button href={route('user.create')}>
                                Create user
                            </Button>
                        )}
                    </ButtonGroup>
                </Form>
            </div>
        </div>
    )
}
