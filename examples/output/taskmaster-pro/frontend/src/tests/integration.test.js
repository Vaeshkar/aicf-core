import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

describe('Frontend Integration Tests', () => {
  test('loads and displays records', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('records-list')).toBeInTheDocument();
    });
  });

  test('can view record details', async () => {
    render(<App />);
    const recordItem = await screen.findByTestId('record-1');
    userEvent.click(recordItem);
    await waitFor(() => {
      expect(screen.getByTestId('record-detail')).toBeInTheDocument();
    });
  });
});
```

3. Let's create an error boundary component: