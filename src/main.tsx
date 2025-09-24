import { render } from 'preact';
import App from './App';
import './styles.css';

const appElement = document.getElementById('app');
if (appElement) {
  render(<App />, appElement);
}
