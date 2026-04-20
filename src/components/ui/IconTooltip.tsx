import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { getTestInfo } from "../../data/testInfo";

interface IconTooltipProps {
    testName: string;
}

export default function IconTooltip({ testName }: IconTooltipProps) {
    const [isHovered, setIsHovered] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const info = getTestInfo(testName);

    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsHovered(true);
    };

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => setIsHovered(false), 200); // Small delay to allow moving to tooltip
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    // Stop propagation so clicking the icon doesn't trigger list item expansion
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    return (
        <div 
            className="relative flex items-center"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
        >
            <Link 
                to={`/test/${encodeURIComponent(testName)}`}
                className="text-gray-400 hover:text-blue-500 transition-colors bg-gray-100 hover:bg-blue-50 rounded-full w-5 h-5 flex items-center justify-center cursor-pointer ml-1"
                title="View details"
                aria-label="View test details"
            >
                <span className="text-[10px] font-bold">ℹ</span>
            </Link>

            {isHovered && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-gray-900 rounded-lg shadow-xl z-50 animate-fade-in pointer-events-auto">
                    <div className="relative">
                        <p className="text-sm font-medium text-white mb-2 leading-snug">
                            {info.short_description}
                        </p>
                        <Link 
                            to={`/test/${encodeURIComponent(testName)}`}
                            className="inline-block text-xs font-bold uppercase tracking-wider text-blue-400 hover:text-blue-300"
                        >
                            Read detailed info &rarr;
                        </Link>
                        {/* Tooltip triangle */}
                        <div className="absolute left-1/2 -bottom-[18px] -translate-x-1/2 border-8 border-transparent border-t-gray-900 pointer-events-none" />
                    </div>
                </div>
            )}
        </div>
    );
}
