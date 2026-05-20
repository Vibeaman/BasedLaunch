import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { ShieldCheck, Lock, Eye, ArrowRight, ArrowUpRight, Wallet, Settings, Rocket, Activity } from 'lucide-react';
import { RocketModel } from '@/components/RocketModel';

const stats = [
  { label: 'Total Tokens Launched', value: '1,248' },
  { label: 'Total Volume', value: '$42.5M' },
  { label: 'Active Creators', value: '312' },
];

const howItWorks = [
  {
    step: '01',
    icon: <Wallet className="w-6 h-6 text-[#00ffd5]" />,
    title: 'Connect Wallet',
    description: 'Link your Phantom, Solflare, or Backpack wallet.',
  },
  {
    step: '02',
    icon: <Settings className="w-6 h-6 text-[#8b5cf6]" />,
    title: 'Configure Token',
    description: 'Set name, supply, vesting, and team allocations.',
  },
  {
    step: '03',
    icon: <Rocket className="w-6 h-6 text-[#ff0080]" />,
    title: 'Pay & Launch',
    description: '$1 flat fee. No hidden costs. No trading fees.',
  },
  {
    step: '04',
    icon: <Activity className="w-6 h-6 text-white" />,
    title: 'Manage & Grow',
    description: 'Track holders, airdrop, share revenue.',
  },
];

const whyBasedLaunch = [
  {
    icon: <ShieldCheck className="w-6 h-6 text-[#00ffd5]" />,
    title: 'No Team Dumps',
    description: 'Vesting schedules enforced on-chain.',
    colSpan: 'md:col-span-7',
    borderRadius: 'rounded-none',
  },
  {
    icon: <Eye className="w-6 h-6 text-[#8b5cf6]" />,
    title: 'Transparent Launches',
    description: 'All allocations visible from day one.',
    colSpan: 'md:col-span-5',
    borderRadius: 'rounded-[2rem]',
  },
  {
    icon: <Lock className="w-6 h-6 text-[#ff0080]" />,
    title: 'Flat $1 Fee',
    description: 'No trading fees, no hidden costs.',
    colSpan: 'md:col-span-5',
    borderRadius: 'rounded-3xl',
  },
  {
    icon: <Rocket className="w-6 h-6 text-white" />,
    title: 'Built for Builders',
    description: 'Post-launch tools: analytics, airdrops, revenue sharing.',
    colSpan: 'md:col-span-7',
    borderRadius: 'rounded-none',
  },
];

export function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-32">
      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[70vh]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="z-10"
        >
          <h1 className="text-[5rem] md:text-[7rem] lg:text-[8rem] font-display font-black leading-[0.85] tracking-tighter mb-8">
            LAUNCH<br />
            <span className="text-gradient">TOKENS.</span><br />
            NOT RUGS.
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-md font-medium">
            The anti-rug launchpad. Team vesting, locked liquidity, transparent launches. Built on Solana.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            <Link
              to="/launch"
              className="inline-flex items-center justify-center px-8 py-4 text-sm font-bold text-black bg-[#00ffd5] rounded-none hover:bg-[#00ffd5]/90 transition-all uppercase tracking-widest border border-[#00ffd5] glow-primary"
            >
              Launch Token
              <ArrowRight className="ml-3 w-4 h-4" />
            </Link>
            <Link
              to="/explore"
              className="inline-flex items-center justify-center px-2 py-4 text-sm font-bold text-white bg-transparent rounded-none hover:text-[#00ffd5] transition-all uppercase tracking-widest border-b border-white/30 hover:border-[#00ffd5]"
            >
              Explore Launches
            </Link>
          </div>
        </motion.div>

        <div className="h-[600px] w-full relative">
          <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <RocketModel />
          </Canvas>
        </div>
      </div>

      {/* Diagonal Divider */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-20 transform -skew-y-2" />

      {/* How It Works - Vertical Scroll Journey */}
      <div className="mt-32">
        <div className="mb-24">
          <h2 className="text-5xl md:text-7xl font-display font-black mb-6 tracking-tighter">HOW IT WORKS</h2>
          <p className="text-gray-400 max-w-xl text-lg">From idea to live token in four simple steps.</p>
        </div>
        
        <div className="space-y-32 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
          {howItWorks.map((step, i) => {
            const isEven = i % 2 === 0;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7 }}
                className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group ${isEven ? 'md:flex-row' : ''}`}
              >
                {/* Timeline dot */}
                <div className="absolute left-5 md:left-1/2 -translate-x-1/2 flex items-center justify-center w-10 h-10 rounded-full border-4 border-black bg-[#00ffd5] shadow-[0_0_0_4px_rgba(0,255,213,0.1)] group-hover:shadow-[0_0_0_8px_rgba(0,255,213,0.2)] transition-shadow duration-500 z-10">
                  <div className="w-2 h-2 bg-black rounded-full" />
                </div>

                {/* Content */}
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] ml-auto md:ml-0">
                  <div className={`flex flex-col ${isEven ? 'md:items-end md:text-right' : 'md:items-start md:text-left'}`}>
                    <div className="text-[8rem] md:text-[12rem] font-display font-black leading-none text-white/[0.03] -mb-12 md:-mb-20 select-none">
                      {step.step}
                    </div>
                    <div className="relative z-10 bg-black/50 backdrop-blur-sm border border-white/5 p-8 hover:border-white/20 transition-colors w-full">
                      <div className={`w-12 h-12 rounded-none bg-white/5 flex items-center justify-center mb-6 ${isEven ? 'md:ml-auto' : ''}`}>
                        {step.icon}
                      </div>
                      <h3 className="text-3xl font-bold mb-4 font-display">{step.title}</h3>
                      <p className="text-gray-400 text-lg leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Diagonal Divider */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-32 transform skew-y-2" />

      {/* Why BasedLaunch - Asymmetric Grid */}
      <div className="mt-32">
        <div className="mb-16">
          <h2 className="text-5xl md:text-7xl font-display font-black mb-6 tracking-tighter">WHY<br/>BASEDLAUNCH.</h2>
          <p className="text-gray-400 max-w-xl text-lg">We've engineered out the rug pulls. Every token launched follows strict security protocols.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {whyBasedLaunch.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`bg-white/[0.02] border border-white/10 p-10 hover:border-[#00ffd5]/50 transition-colors group ${feature.colSpan} ${feature.borderRadius}`}
            >
              <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-2xl font-bold mb-4 font-display">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed text-lg">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Diagonal Divider */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-32 transform -skew-y-2" />

      {/* Stats Bar - Horizontal Layout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-12 py-12"
      >
        {stats.map((stat, i) => (
          <div key={i} className="flex-1">
            <div className="text-5xl md:text-7xl font-display font-black text-gradient mb-4 tracking-tighter">{stat.value}</div>
            <div className="text-gray-400 text-sm uppercase tracking-widest font-bold">{stat.label}</div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
