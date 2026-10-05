import React from 'react';
import { Provider } from 'react-redux';
import ReactDOM from 'react-dom/client';

import App from './App';
import './index.css';
import './styles/features.css';
import { store } from './store/store';
import { registerServiceWorker } from './lib/offline';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);

registerServiceWorker();
