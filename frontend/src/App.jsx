import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ChunksPage from './pages/ChunksPage';
import SummaryPage from './pages/SummaryPage';
import Chat from './components/Chat';
import ErrorBoundary from './components/shared/ErrorBoundary';
import ChunksViewer from './components/ChunksViewer';
import { ConfigProvider, App as AntdApp } from 'antd'
import enUS from 'antd/locale/en_US'
import { antdCompatibilityConfig } from './config/antd-compatibility'
import './App.css';

function App() {
  return (
    <ConfigProvider
      locale={enUS}
      {...antdCompatibilityConfig}
    >
      <AntdApp>
        <ErrorBoundary>
          <Router>
            <div className="App">
              <Routes>
                {/* Main document summarization flow */}
                <Route path="/" element={
                  <ErrorBoundary>
                    <LandingPage />
                  </ErrorBoundary>
                } />
                <Route path="/chunks/:documentId" element={
                  <ErrorBoundary>
                    <ChunksViewer />
                  </ErrorBoundary>
                } />
                <Route path="/summary/:documentId" element={
                  <ErrorBoundary>
                    <SummaryPage />
                  </ErrorBoundary>
                } />
                
                {/* Legacy chat route for conversation generation */}
                <Route path="/chat" element={
                  <ErrorBoundary>
                    <Chat />
                  </ErrorBoundary>
                } />
                
                {/* Fallback route - redirect to home */}
                <Route path="*" element={
                  <ErrorBoundary>
                    <LandingPage />
                  </ErrorBoundary>
                } />
              </Routes>
            </div>
          </Router>
        </ErrorBoundary>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
