import React from 'react';
import ReactDOM from 'react-dom/client';
import RecordPage from './pages/RecordPage';
import './styles/global.css';

// No router needed – this is a single-page mobile app.
// sessionId is read from the URL query string inside RecordPage.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RecordPage />
  </React.StrictMode>
);
