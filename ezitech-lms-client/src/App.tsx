import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

import { store } from './app/store';
import { queryClient } from './app/queryClient';
import AppRoutes from './routes/AppRoutes';
import { ThemeProvider } from './providers/ThemeProvider';

export default function App() {
  return (
    <ThemeProvider>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </QueryClientProvider>
      </Provider>
    </ThemeProvider>
  );
}
