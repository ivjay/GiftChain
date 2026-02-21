import { motion } from 'framer-motion';

export default function Logo({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg', className?: string }) {
    const iconSizes = {
        sm: 'w-8 h-8 text-lg',
        md: 'w-10 h-10 text-xl',
        lg: 'w-12 h-12 text-2xl',
    };

    return (
        <div className={`flex items-center gap-2.5 group ${className}`}>
            <motion.div 
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                className={`${iconSizes[size]} rounded-xl gradient-primary flex items-center justify-center shadow-lg group-hover:shadow-primary/40 transition-all duration-300 relative overflow-hidden`}
            >
                {/* Glossy overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-60" />
                
                {/* The "Gift" symbol */}
                <span className="relative z-10 drop-shadow-md">G</span>
                
                {/* Decorative dots/nodes representing "Chain" */}
                <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-white/80" />
                <div className="absolute bottom-1 left-1 w-1 h-1 rounded-full bg-white/80" />
                <div className="absolute top-1/2 left-0.5 w-1 h-1 rounded-full bg-white/40" />
            </motion.div>
            
            <div className={`flex flex-col ${size === 'sm' ? 'hidden' : 'flex'}`}>
                <span className={`${size === 'lg' ? 'text-2xl' : 'text-lg'} font-bold gradient-text leading-tight tracking-tight`} style={{ fontFamily: 'var(--font-display)' }}>
                    GiftChain
                </span>
                <span className={`${size === 'lg' ? 'text-[10px]' : 'text-[9px]'} text-text-muted -mt-0.5 tracking-[0.2em] font-black uppercase`}>
                    Block & Node
                </span>
            </div>
        </div>
    );
}
