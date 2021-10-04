import { h } from 'preact';
import preactRender from 'preact-render-to-string';
import { Shell } from './components/shell';


(global as any).shellHTML = preactRender(<Shell></Shell>)
