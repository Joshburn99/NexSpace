
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Logo({ size = "md", className }: LogoProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10", 
    lg: "w-16 h-16",
  };

  const svgSizeClasses = {
    sm: "32",
    md: "40",
    lg: "64",
  };

  return (
    <div className={cn("relative flex items-center justify-center", sizeClasses[size], className)}>
      <svg
        width={svgSizeClasses[size]}
        height={svgSizeClasses[size]}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="nexspace-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4A90E2" />
            <stop offset="50%" stopColor="#357ABD" />
            <stop offset="100%" stopColor="#2E5F8F" />
          </linearGradient>
        </defs>
        
        {/* Stylized N with curved design matching the screenshot */}
        <path
          d="M15 75 Q20 15 35 15 Q45 15 50 25 L65 55 Q70 65 75 55 L85 25 Q90 15 95 25 L95 75 Q90 85 85 75 L75 45 Q70 35 65 45 L50 75 Q45 85 35 75 L20 45 Q15 35 15 45 Z"
          fill="url(#nexspace-gradient)"
          stroke="none"
        />
        
        {/* Additional curved accent to match the flowing design */}
        <path
          d="M25 20 Q40 10 55 20 Q70 30 85 20"
          stroke="url(#nexspace-gradient)"
          strokeWidth="3"
          fill="none"
          opacity="0.6"
        />
      </svg>
    </div>
  );
}
