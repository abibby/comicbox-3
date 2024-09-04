import { PersistentState } from 'src/hooks/persistent-state'

export type Theme = null | 'dark' | 'light'

export default {
    theme: new PersistentState<Theme>('theme', null),
}
