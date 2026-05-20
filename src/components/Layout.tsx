import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { ThreeBackground } from './ThreeBackground';

export function Layout() {
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
