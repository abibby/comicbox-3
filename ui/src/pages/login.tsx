import { FunctionalComponent, h } from 'preact'
import { Link, route } from 'preact-router'
import { useCallback } from 'preact/hooks'
import { auth, FetchError } from '../api'
import { prompt } from '../components/alert'
import { Data, Form } from '../components/form/form'
import { Input } from '../components/form/input'

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
        <div>
            <h1>Login</h1>
            <Form onSubmit={submit}>
                <Input title='Username' name='username' focused />
                <Input title='Password' type='password' name='password' />
                <button type='submit'>Login</button>
            </Form>
            <Link href='/users/create'>Create user</Link>
        </div>
    )
}
