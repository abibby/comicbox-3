import { persistentSignal } from 'src/hooks/signals'

export type Theme = null | 'dark' | 'light'

export default {
    theme: persistentSignal<Theme>('theme', null),
}
