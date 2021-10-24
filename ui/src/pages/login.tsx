import { FunctionalComponent, h } from 'preact'
import { Link, route } from 'preact-router'
import { useCallback } from 'preact/hooks'
import { auth } from '../api'
import { Data, Form } from '../components/form/form'

export const Login: FunctionalComponent = () => {
    const submit = useCallback(async (data: Data) => {
        await auth.login({
            username: data.get('username') ?? '',
            password: data.get('password') ?? '',
        })

        route('/')
    }, [])

    return (
        <div>
            <h1>Login</h1>
            <Form onSubmit={submit}>
                <input type='text' name='username' />
                <input type='password' name='password' />
                <button type='submit'>Login</button>
            </Form>
            <Link href='/users/create'>Create user</Link>
        </div>
    )
}
