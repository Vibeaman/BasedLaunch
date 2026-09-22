import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { ThreeBackground } from './ThreeBackground';

export function Layout() {
  // Capture a referral code from the URL (?ref=<wallet>) once per visit so it can
  // be attributed later. Stored locally only — no on-chain or network side effects.
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get('ref');
      if (ref && ref.length >= 32 && ref.length <= 44) {
        localStorage.setItem('bl_ref', ref);
      }
    } catch {
      /* ignore storage/URL errors */
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative selection:bg-[#00ffd5] selection:text-black">
      <div className="bg-noise" />
      <ThreeBackground />
      <Navbar />
      <main className="flex-grow pt-24">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
