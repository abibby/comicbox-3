import { FunctionalComponent, h } from 'preact'
import { useRoute } from 'preact-iso'
import { useCallback, useEffect, useMemo, useState } from 'preact/hooks'
import { userAPI } from 'src/api'
import { useJWTClaims } from 'src/api/auth'
import { Data, Form } from 'src/components/form/form'
import { Input } from 'src/components/form/input'
import { Select } from 'src/components/form/select'
import {
    Modal,
    ModalBody,
    ModalHead,
    ModalHeadActions,
} from 'src/components/modal'
import { openToast } from 'src/components/toast'
import { useRoles } from 'src/hooks/role'
import { User } from 'src/models'

export const UserEdit: FunctionalComponent = () => {
    const { params } = useRoute()
    const userId = params.user ?? ''

    const myClaims = useJWTClaims()

    const roles = useRoles()
    const [user, setUser] = useState<User>()

    useEffect(() => {
        userAPI
            .index({ id: userId, page_size: 1 })
            .then(resp => setUser(resp.data[0]))
            .catch(e => openToast('failed to fetch users: ' + e.message))
    }, [userId])

    const roleOptions = useMemo(
        () => roles.map(role => [role.id, role.name] as const),
        [roles],
    )

    const submit = useCallback(
        async (data: Data) => {
            if (!user) {
                return
            }
            try {
                await userAPI.update(user.id, {
                    password: data.get('password'),
                    role_id: data.getNumber('role_id'),
                })
            } catch (e) {
                await openToast('Could not save user: ' + e)
            }
        },
        [user],
    )

    return (
        <Modal>
            <Form onSubmit={submit}>
                <ModalHead>
                    Edit User
                    <ModalHeadActions>
                        <button type='submit'>save</button>
                    </ModalHeadActions>
                </ModalHead>
                <ModalBody>
                    <Input
                        title='Username'
                        name='username'
                        value={user?.username}
                        readonly
                    />
                    <Input title='Password' name='password' type='password' />
                    <Select
                        title='Role'
                        name='role_id'
                        options={roleOptions}
                        value={user?.role?.id}
                        disabled={user?.id === myClaims?.sub}
                    />
                </ModalBody>
            </Form>
        </Modal>
    )
}
