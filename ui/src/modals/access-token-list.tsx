import { FunctionalComponent, h } from 'preact'
import { useCallback, useEffect, useState } from 'preact/hooks'
import { accessTokenAPI } from 'src/api'
import { Button } from 'src/components/button'
import { Modal, ModalHead, ModalBody } from 'src/components/modal'
import { openToast } from 'src/components/toast'
import { AccessToken } from 'src/models'
import styles from 'src/modals/user-index.module.css'
import { Input } from 'src/components/form/input'
import { bind } from '@zwzn/spicy'

export const AccessTokenList: FunctionalComponent = () => {
    const [accessTokens, setAccessTokens] = useState<AccessToken[]>()
    const [newKey, setNewKey] = useState('')
    const [newName, setNewName] = useState('')
    useEffect(() => {
        accessTokenAPI
            .index()
            .then(resp => setAccessTokens(resp))
            .catch(e =>
                openToast('failed to fetch access tokens: ' + e.message),
            )
    }, [])

    const createAccessToken = useCallback(async () => {
        const { key, token } = await accessTokenAPI.create({
            name: newName,
        })
        setNewKey(key)
        if (token) {
            setAccessTokens(tokens => [token].concat(tokens ?? []))
        }
        setNewName('')
    }, [newName])

    const deleteAccessToken = useCallback(async (id: string) => {
        await accessTokenAPI.remove(id)
        setAccessTokens(tokens => tokens?.filter(t => t.id != id))
    }, [])

    return (
        <Modal>
            <ModalHead>Access Tokens</ModalHead>
            <ModalBody>
                <Input
                    title='Name'
                    name='name'
                    value={newName}
                    onInput={setNewName}
                />
                <Button onClick={createAccessToken}>Create</Button>
                {newKey && <div>{newKey}</div>}
                <table class={styles.userList}>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Created</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {accessTokens?.map(token => (
                            <tr key={token.id}>
                                <td>{token.name}</td>
                                <td>{token.created_at.split('T')[0]}</td>
                                <td>
                                    <Button
                                        onClick={bind(
                                            token.id,
                                            deleteAccessToken,
                                        )}
                                    >
                                        Delete
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </ModalBody>
        </Modal>
    )
}
