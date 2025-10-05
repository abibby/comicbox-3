import { bind } from '@zwzn/spicy'
import { FunctionalComponent, h } from 'preact'
import { useEffect, useMemo, useState } from 'preact/hooks'
import { userAPI } from 'src/api'
import { Button } from 'src/components/button'
import { Modal, ModalHead, ModalBody } from 'src/components/modal'
import { openModal } from 'src/components/modal-controller'
import { openToast } from 'src/components/toast'
import { User } from 'src/models'
import { encode } from 'src/util'
import styles from 'src/modals/user-index.module.css'
import { PaginatedResponse } from 'src/api/internal'
import { Select } from 'src/components/form/select'

export const UserIndex: FunctionalComponent = () => {
    const [usersResponse, setUsersResponse] =
        useState<PaginatedResponse<User>>()
    const [currentPage, setCurrentPage] = useState('1')
    useEffect(() => {
        userAPI
            .index({ page: Number(currentPage) })
            .then(resp => setUsersResponse(resp))
            .catch(e => openToast('failed to fetch users: ' + e.message))
    }, [currentPage])

    const users = usersResponse?.data

    const pageOptions = useMemo(() => {
        const total = usersResponse?.total ?? 1
        const pageSize = usersResponse?.page_size ?? 1
        return new Array(Math.ceil(total / pageSize)).fill(0).map((_, i) => {
            const page = (i + 1).toString()
            return [page, page] as const
        })
    }, [usersResponse?.page_size, usersResponse?.total])

    return (
        <Modal>
            <ModalHead>Users</ModalHead>
            <ModalBody>
                <table class={styles.userList}>
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Role</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {users?.map(user => (
                            <tr key={user.id}>
                                <td>{user.username}</td>
                                <td>{user.role?.name}</td>
                                <td class={styles.buttons}>
                                    <Button
                                        onClick={bind(
                                            encode`/user/${user.id}`,
                                            openModal,
                                        )}
                                    >
                                        Edit
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {pageOptions.length > 1 && (
                    <Select
                        title='Page'
                        name='page'
                        options={pageOptions}
                        value={currentPage}
                        onInput={setCurrentPage}
                    />
                )}
            </ModalBody>
        </Modal>
    )
}
