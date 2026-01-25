import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
    className?: string;
    animate?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className, animate = false, ...props }) => {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn("w-10 h-10", className)}
            {...props}
        >
            <defs>
                <linearGradient id="logo_gradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0.5" />
                </linearGradient>
            </defs>

            <circle cx="12" cy="12" r="3" fill="currentColor" className={cn(animate && "animate-pulse")} />

            <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9V5" />
                <path d="M12 19v-4" />
                <path d="M9 12H5" />
                <path d="M19 12h-4" />

                <circle cx="12" cy="3" r="1.5" className="fill-current" />
                <circle cx="12" cy="21" r="1.5" className="fill-current" />
                <circle cx="3" cy="12" r="1.5" className="fill-current" />
                <circle cx="21" cy="12" r="1.5" className="fill-current" />
            </g>

            <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="4 4" />
        </svg>
    );
};
