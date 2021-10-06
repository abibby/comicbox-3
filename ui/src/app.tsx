import { h, render } from 'preact'
import { bookList } from './api/book'
import { Shell } from './components/shell'

bookList().then(console.log)

render(<Shell><h1>Test</h1></Shell>, document.getElementById('app')!)
