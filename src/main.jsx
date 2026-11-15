import { createRoot } from 'react-dom/client';

import App from './App.jsx';
import './index.css';
import { BrowserRouter } from 'react-router';

import store from './app/store';
import { Provider } from 'react-redux';

import { ClerkProvider } from '@clerk/react';

import useLoadCart from './hooks/useLoadCart';
import FavoritesLoader from './components/FavoritesLoader.jsx';

function CartLoader() {
	useLoadCart();
	return null;
}

createRoot(document.getElementById('root')).render(
	<BrowserRouter>
		<ClerkProvider afterSignOutUrl={'/'}>
			<Provider store={store}>
				<CartLoader />
				<FavoritesLoader />
				<App />
			</Provider>
		</ClerkProvider>
	</BrowserRouter>,
);
