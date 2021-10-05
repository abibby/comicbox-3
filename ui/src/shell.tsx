import { h } from 'preact';
import preactRender from 'preact-render-to-string';
import { Shell } from './components/shell';


export const shell = preactRender(<Shell></Shell>)
