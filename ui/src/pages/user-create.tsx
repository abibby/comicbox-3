import { Fragment, FunctionalComponent, h } from 'preact'
import { useCallback, useState } from 'preact/hooks'
import { FetchError, userAPI } from 'src/api'
import { openToast } from 'src/components/toast'
import { Data, Errors, Form } from 'src/components/form/form'
import { Input } from 'src/components/form/input'
import { useLocation } from 'preact-iso'

export const UserCreate: FunctionalComponent = () => {
    const { route } = useLocation()
    const [errors, setErrors] = useState<Errors>()
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
                await userAPI.create(
                    {
                        username: data.get('username') ?? '',
                        password: password,
                    },
                    token,
                )
            } catch (e) {
                if (e instanceof FetchError) {
                    if (e.status === 401) {
                        await openToast('invalid username or password')
                        return
                    } else if (e.status === 422) {
                        setErrors(e.body)
                        return
                    }
                }
                await openToast('error logging in')
                return
            }
            route('/login')
        },
        [route],
    )

    return (
        <Fragment>
            <h1>Create User</h1>
            <Form onSubmit={submit} errors={errors}>
                <Input title='Username' type='text' name='username' focused />
                <Input title='Password' type='password' name='password' />
                <Input
                    title='Repeat Password'
                    type='password'
                    name='password_rep'
                />
                <button type='submit'>Create</button>
            </Form>
        </Fragment>
    )
}
