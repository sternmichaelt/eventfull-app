import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app header', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'EventFull', level: 1 })).toBeInTheDocument();
});
