import { Link, useLocation } from 'react-router-dom';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Rocket, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, connected, walletAddress } = useAuth();

  // Log when user connects (for debugging)
  useEffect(() => {
    if (connected && walletAddress) {
      console.log('Wallet connected:', walletAddress);
      console.log('User from DB:', user);
    }
  }, [connected, walletAddress, user]);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Launch', path: '/launch' },
    { name: 'Explore', path: '/explore' },
    { name: 'Dashboard', path: '/dashboard' },
  ];
  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl rounded-full bg-black/40 backdrop-blur-xl border border-white/10 px-6 py-3 transition-all duration-300 hover:border-white/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="flex items-center gap-2 group">
            <Rocket className="w-5 h-5 text-[#00ffd5] group-hover:-translate-y-1 transition-transform" />
            <span className="font-display font-bold text-lg tracking-tight">
              Based<span className="text-gradient">Launch</span>
            </span>
          </Link>
        </div>
        
        <div className="hidden md:block">
          <div className="flex items-baseline space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-all relative group",
                  location.pathname === link.path
                    ? "text-white"
                    : "text-gray-400 hover:text-white"
                )}
              >
                {link.name}
                {location.pathname === link.path && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-[#00ffd5] rounded-full" />
                )}
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-white/50 rounded-full transition-all group-hover:w-4 opacity-0 group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </div>

        <div className="hidden md:block">
          <div className="wallet-btn-wrapper">
            <WalletMultiButton className="!bg-transparent hover:!bg-white/5 !text-white !transition-all !border !border-white/10 !rounded-full !font-sans !font-semibold !h-10 !px-6" />
          </div>
        </div>

        <div className="flex md:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center justify-center p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/5 focus:outline-none"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 w-full mt-4 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col gap-2">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              onClick={() => setIsOpen(false)}
              className={cn(
                "block px-4 py-3 rounded-xl text-base font-medium transition-colors",
                location.pathname === link.path
                  ? "text-[#00ffd5] bg-[#00ffd5]/10"
                  : "text-gray-300 hover:text-white hover:bg-white/5"
              )}
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-4 mt-2 border-t border-white/10">
            <WalletMultiButton className="!w-full !justify-center !bg-transparent !text-white !border !border-white/20 !rounded-xl" />
          </div>
        </div>
      )}
    </nav>
  );
}
