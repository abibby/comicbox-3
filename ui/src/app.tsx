import { h, render } from 'preact'
import { BookList } from './components/book-list'
import { Shell } from './components/shell'

render(
    <Shell>
        <h1>Test</h1>
        <BookList />
    </Shell>,
    document.getElementById('app')!
)
