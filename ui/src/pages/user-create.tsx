import { FunctionalComponent, h } from 'preact'
import { useCallback, useState } from 'preact/hooks'
import { FetchError, user } from '../api'
import { prompt } from '../components/alert'
import { Data, Form } from '../components/form/form'
import { Errors } from '../components/form/form-element'
import { Input } from '../components/form/input'

export const UserCreate: FunctionalComponent = () => {
    const [errors, setErrors] = useState<Errors | undefined>(undefined)
    const submit = useCallback(
        async (data: Data) => {
            try {
                const password = data.get('password') ?? ''
                const passwordRep = data.get('password_rep') ?? ''
                if (password !== passwordRep) {
                    setErrors({
                        password_rep: ['passwords do not match'],
                    })
                    console.log('test')

                    return
                }
                await user.create({
                    username: data.get('username') ?? '',
                    password: password,
                })
            } catch (e) {
                if (e instanceof FetchError) {
                    if (e.status === 401) {
                        await prompt('invalid username or password', {}, 5000)
                        return
                    }
                }
                await prompt('error logging in')
            }
        },
        [setErrors],
    )

    return (
        <div>
            <h1>Create User</h1>
            <Form onSubmit={submit}>
                <Input
                    title='Username'
                    type='text'
                    name='username'
                    errors={errors}
                />
                <Input
                    title='Password'
                    type='text'
                    name='password'
                    errors={errors}
                />
                <Input
                    title='Repeat Password'
                    type='text'
                    name='password_rep'
                    errors={errors}
                />
                <button type='submit'>Create</button>
            </Form>
        </div>
    )
}
