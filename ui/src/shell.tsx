import { h } from 'preact'
import preactRender from 'preact-render-to-string'
import { Shell } from 'src/components/shell'

export const shell = preactRender(<Shell />)
