import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
// import { ThreeBackground } from './ThreeBackground'; // Temporarily disabled - may cause WebGL issues

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col relative selection:bg-[#00ffd5] selection:text-black">
      <div className="bg-noise" />
      {/* <ThreeBackground /> */}
      <div className="fixed inset-0 z-[-1] bg-[#0a0a0f]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#8b5cf6]/20 via-[#0a0a0f] to-[#0a0a0f]" />
      </div>
      <Navbar />
      <main className="flex-grow pt-24">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
