import { FunctionalComponent, h } from 'preact'
import { route } from 'preact-router'
import { useCallback, useState } from 'preact/hooks'
import { FetchError, user } from 'src/api'
import { prompt } from 'src/components/alert'
import { Data, Form } from 'src/components/form/form'
import { Errors } from 'src/components/form/form-element'
import { Input } from 'src/components/form/input'

export const UserCreate: FunctionalComponent = () => {
    const [errors, setErrors] = useState<Errors | undefined>(undefined)
    const submit = useCallback(
        async (data: Data) => {
            setErrors({})
            const password = data.get('password') ?? ''
            const passwordRep = data.get('password_rep') ?? ''
            if (password !== passwordRep) {
                setErrors({
                    password_rep: ['passwords do not match'],
                })
                return
            }

            const token = new URLSearchParams(window.location.search).get(
                '_token',
            )

            try {
                await user.create(
                    {
                        username: data.get('username') ?? '',
                        password: password,
                    },
                    token,
                )
            } catch (e) {
                if (e instanceof FetchError) {
                    if (e.status === 401) {
                        await prompt('invalid username or password')
                        return
                    } else if (e.status === 422) {
                        setErrors(e.body)
                        return
                    }
                }
                await prompt('error logging in')
                return
            }
            route('/login')
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
                    focused
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
