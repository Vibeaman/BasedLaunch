/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './components/WalletProvider';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Launch } from './pages/Launch';
import { Explore } from './pages/Explore';
import { TokenDetail } from './pages/TokenDetail';
import { Dashboard } from './pages/Dashboard';
import { Docs } from './pages/Docs';
import { Component, ErrorInfo, ReactNode } from 'react';

// Error Boundary to catch render errors
class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('React Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding: '20px', color: 'white', background: '#1a1a2e'}}>
          <h1>Something went wrong</h1>
          <pre style={{color: '#ff6b6b', whiteSpace: 'pre-wrap'}}>{this.state.error?.toString()}</pre>
          <pre style={{color: '#888', fontSize: '12px', marginTop: '10px'}}>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  console.log('App component rendering');
  return (
    <ErrorBoundary>
      <WalletProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="launch" element={<Launch />} />
              <Route path="explore" element={<Explore />} />
              <Route path="token/:mint" element={<TokenDetail />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="docs" element={<Docs />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </WalletProvider>
    </ErrorBoundary>
  );
}
