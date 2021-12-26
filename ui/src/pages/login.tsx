import { FunctionalComponent, h } from 'preact'
import { route } from 'preact-router'
import { useCallback } from 'preact/hooks'
import { Button, ButtonGroup } from 'src/components/button'
import { auth, FetchError } from '../api'
import { prompt } from '../components/alert'
import { Data, Form } from '../components/form/form'
import { Input } from '../components/form/input'
import styles from './login.module.css'

export const Login: FunctionalComponent = () => {
    const submit = useCallback(async (data: Data) => {
        try {
            await auth.login({
                username: data.get('username') ?? '',
                password: data.get('password') ?? '',
            })

            route('/')
        } catch (e) {
            if (e instanceof FetchError) {
                if (e.status === 401) {
                    await prompt('invalid username or password', {}, 5000)
                    return
                }
            }
            await prompt('error logging in')
        }
    }, [])

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
                        <Button href='/users/create'>Create user</Button>
                    </ButtonGroup>
                </Form>
            </div>
        </div>
    )
}
