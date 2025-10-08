import { render, screen, fireEvent } from '@testing-library/react';
import TodoList from '../components/TodoList';

describe('TodoList Component', () => {
  test('renders todo list', () => {
    render(<TodoList />);
    expect(screen.getByText(/Todo List/i)).toBeInTheDocument();
  });

  test('adds new todo', async () => {
    render(<TodoList />);
    const input = screen.getByPlaceholderText(/Add todo/i);
    fireEvent.change(input, { target: { value: 'New Todo' } });
    fireEvent.click(screen.getByText(/Add/i));
    expect(await screen.findByText('New Todo')).toBeInTheDocument();
  });
});
```

4. Let's create an error handling middleware: