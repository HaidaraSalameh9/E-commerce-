import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.jsx';
import './index.css';
import { BrowserRouter } from "react-router";

import store from './app/store';
import { Provider } from 'react-redux';

import { ClerkProvider } from '@clerk/react';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ClerkProvider afterSignOutUrl={"/"}>
      <Provider store={store}>
        <App />
      </Provider>
    </ClerkProvider>
  </BrowserRouter>

);
