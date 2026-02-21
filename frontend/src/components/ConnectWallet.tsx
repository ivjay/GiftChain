import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { truncateAddress, copyToClipboard } from '../lib/utils';
import { HiChevronDown, HiLogout, HiExternalLink, HiClipboardCopy } from 'react-icons/hi';

export default function ConnectWallet() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    if (!address) return;
    const success = await copyToClipboard(address);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isConnected) {
    return (
      <button
        onClick={() => {
          // Priority: 1. Injected (MetaMask), 2. Any other connector
          const connector = connectors.find(c => c.id === 'injected') || 
                           connectors[0];
                           
          if (connector) {
            connect({ connector }, {
              onError: (err: any) => {
                console.error('[ConnectWallet] Error:', err);
                if (err.message?.includes('Connector not found') || err.message?.includes('not found')) {
                  alert('MetaMask not detected. Please ensure the extension is installed and enabled.');
                } else {
                  alert(`Connection failed: ${err.shortMessage || err.message}`);
                }
              },
            });
          } else {
            window.open('https://metamask.io/download/', '_blank');
          }
        }}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 transition-all cursor-pointer shadow-lg glow group"
      >
        <svg width="20" height="20" viewBox="0 0 35 33" fill="none" xmlns="http://www.w3.org/2000/svg" className="group-hover:scale-110 transition-transform">
          <path d="M32.9582 1L19.8241 10.7183L22.2665 4.99099L32.9582 1Z" fill="#E17726" stroke="#E17726" strokeWidth="0.25"/>
          <path d="M2.66296 1L15.6886 10.809L13.3546 4.99099L2.66296 1Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25"/>
          <path d="M28.2295 23.5335L24.7348 28.872L32.2271 30.9323L34.3807 23.6501L28.2295 23.5335Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25"/>
          <path d="M1.27246 23.6501L3.41602 30.9323L10.8989 28.872L7.41364 23.5335L1.27246 23.6501Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25"/>
          <path d="M10.4706 14.5149L8.39209 17.6507L15.8084 17.9881L15.5576 9.97437L10.4706 14.5149Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25"/>
          <path d="M25.1505 14.5149L19.9924 9.88354L19.8241 17.9881L27.2311 17.6507L25.1505 14.5149Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25"/>
          <path d="M10.8989 28.8721L15.3984 26.7166L11.4937 23.7009L10.8989 28.8721Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25"/>
          <path d="M20.2227 26.7166L24.7348 28.8721L24.1274 23.7009L20.2227 26.7166Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25"/>
        </svg>
        Connect MetaMask
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 px-4 py-2 rounded-xl glass hover:bg-white/10 transition-all cursor-pointer border border-border/50"
      >
        {/* Chain indicator */}
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${chain?.id === 11155111 ? 'bg-blue-400' : 'bg-green-400'} animate-pulse`} />
          <span className="text-xs text-text-muted hidden sm:block">{chain?.name || 'Unknown'}</span>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-border" />

        {/* Address + Balance */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center text-[10px]">
            🦊
          </div>
          <div className="flex flex-col items-start">
            <span className="text-xs font-semibold">{truncateAddress(address || '')}</span>
            {balance && (
              <span className="text-[10px] text-text-muted leading-none">
                {parseFloat(formatUnits(balance.value, balance.decimals)).toFixed(4)} {balance.symbol}
              </span>
            )}
          </div>
          <HiChevronDown className={`text-text-muted text-sm transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-64 rounded-2xl glass-strong border border-border/50 shadow-2xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="p-4 border-b border-border/30">
              <p className="text-xs text-text-muted mb-1">Connected with MetaMask</p>
              <p className="text-sm font-mono font-medium break-all">{address}</p>
            </div>

            {/* Actions */}
            <div className="p-2">
              <button
                onClick={copyAddress}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-text-muted hover:text-text hover:bg-white/5 transition-all cursor-pointer"
              >
                <HiClipboardCopy className="text-base" />
                {copied ? 'Copied!' : 'Copy Address'}
              </button>
              <a
                href={`https://sepolia.etherscan.io/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-text-muted hover:text-text hover:bg-white/5 transition-all cursor-pointer"
              >
                <HiExternalLink className="text-base" />
                View on Etherscan
              </a>
              <div className="my-1 border-t border-border/30" />
              <button
                onClick={() => { disconnect(); setOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
              >
                <HiLogout className="text-base" />
                Disconnect
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
