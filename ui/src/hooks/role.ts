import { useEffect, useState } from 'preact/hooks'
import { roleAPI } from 'src/api'
import { openToast } from 'src/components/toast'
import { Role } from 'src/models'

let rolesPromise: Promise<Role[]> | undefined

export function useRoles(): Role[] {
    const [roles, setRoles] = useState<Role[]>([])
    useEffect(() => {
        if (rolesPromise === undefined) {
            rolesPromise = roleAPI.index().catch(e => {
                rolesPromise = undefined
                throw e
            })
        }
        rolesPromise
            .then(setRoles)
            .catch(e => openToast('failed to fetch roles: ' + e.message))
    }, [])
    return roles
}
