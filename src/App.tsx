/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, Component, ErrorInfo, ReactNode, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

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
        <div style={{padding: '20px', color: 'white', background: '#1a1a2e', minHeight: '100vh'}}>
          <h1 style={{color: '#ff6b6b'}}>Something went wrong</h1>
          <pre style={{color: '#ff6b6b', whiteSpace: 'pre-wrap'}}>{this.state.error?.toString()}</pre>
          <pre style={{color: '#888', fontSize: '12px', marginTop: '10px'}}>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// Lazy load heavy components
const WalletProvider = lazy(() => import('./components/WalletProvider').then(m => ({ default: m.WalletProvider })));
const Layout = lazy(() => import('./components/Layout').then(m => ({ default: m.Layout })));
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const Launch = lazy(() => import('./pages/Launch').then(m => ({ default: m.Launch })));
const Explore = lazy(() => import('./pages/Explore').then(m => ({ default: m.Explore })));
const TokenDetail = lazy(() => import('./pages/TokenDetail').then(m => ({ default: m.TokenDetail })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Docs = lazy(() => import('./pages/Docs').then(m => ({ default: m.Docs })));

// Loading fallback
function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#00ffd5',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '1.5rem'
    }}>
      Loading BasedLaunch...
    </div>
  );
}

// Minimal test to confirm React works
function MinimalTest() {
  const [count, setCount] = useState(0);
  const [showFull, setShowFull] = useState(false);

  useEffect(() => {
    console.log('MinimalTest mounted - React is working!');
    // Auto-show full app after 1 second if minimal works
    const timer = setTimeout(() => setShowFull(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (!showFull) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
        gap: '20px'
      }}>
        <h1 style={{color: '#00ffd5', fontSize: '2rem'}}>BasedLaunch</h1>
        <p>React is working! Count: {count}</p>
        <button 
          onClick={() => setCount(c => c + 1)}
          style={{
            padding: '10px 20px',
            background: '#00ffd5',
            color: 'black',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Click me
        </button>
        <p style={{color: '#888', fontSize: '14px'}}>Loading full app...</p>
      </div>
    );
  }

  // Full app with lazy loading
  return (
    <Suspense fallback={<LoadingScreen />}>
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
    </Suspense>
  );
}

export default function App() {
  console.log('App component rendering');
  return (
    <ErrorBoundary>
      <MinimalTest />
    </ErrorBoundary>
  );
}
