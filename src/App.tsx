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

export default function App() {
  return (
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
  );
}
