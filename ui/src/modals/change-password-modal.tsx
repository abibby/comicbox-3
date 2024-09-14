import { h } from 'preact'
import { useCallback, useState } from 'preact/hooks'
import { changePassword } from 'src/api/auth'
import { Button, ButtonGroup } from 'src/components/button'
import { Errors, Form, GlobalErrors } from 'src/components/form/form'
import { Input } from 'src/components/form/input'
import { Modal, ModalBody, ModalFoot, ModalHead } from 'src/components/modal'
import { useModal } from 'src/components/modal-controller'

export function ChangePasswordModal() {
    const { close } = useModal()

    const [oldPassword, setOldPassword] = useState('')
    const [newPassword1, setNewPassword1] = useState('')
    const [newPassword2, setNewPassword2] = useState('')

    const [errors, setErrors] = useState<Errors>({})

    const save = useCallback(async () => {
        if (newPassword1 !== newPassword2) {
            setErrors({
                new_password_1: ['passwords do not match'],
                new_password_2: ['passwords do not match'],
            })
            return
        }
        setErrors({})

        await changePassword({
            old_password: oldPassword,
            new_password: newPassword1,
        })

        close()
    }, [close, newPassword1, newPassword2, oldPassword])
    return (
        <Modal>
            <Form onSubmit={save} errors={errors}>
                <ModalHead>Change Password</ModalHead>
                <ModalBody>
                    <GlobalErrors />
                    <Input
                        title='Old Password'
                        name='old_password'
                        type='password'
                        value={oldPassword}
                        onInput={setOldPassword}
                    />
                    <Input
                        title='New Password'
                        name='new_password_1'
                        type='password'
                        value={newPassword1}
                        onInput={setNewPassword1}
                    />
                    <Input
                        title='Repeat New Password'
                        name='new_password_2'
                        type='password'
                        value={newPassword2}
                        onInput={setNewPassword2}
                    />
                </ModalBody>
                <ModalFoot>
                    <ButtonGroup>
                        <Button type='submit'>Save</Button>
                    </ButtonGroup>
                </ModalFoot>
            </Form>
        </Modal>
    )
}
