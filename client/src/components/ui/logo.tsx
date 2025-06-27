
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  showText?: boolean;
}

export function Logo({ size = "md", className, showText = true }: LogoProps) {
  const containerClasses = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-2xl",
  };

  const nClasses = {
    sm: "text-2xl",
    md: "text-4xl", 
    lg: "text-6xl",
  };

  if (!showText) {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <span 
          className={cn(
            "font-black leading-none",
            nClasses[size]
          )}
          style={{ 
            background: 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 50%, #1E40AF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '-0.02em'
          }}
        >
          N
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-baseline space-x-0", className)}>
      <span 
        className={cn(
          "font-black leading-none",
          nClasses[size]
        )}
        style={{ 
          background: 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 50%, #1E40AF 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '-0.02em'
        }}
      >
        N
      </span>
      <span 
        className={cn(
          "font-semibold text-black leading-none",
          containerClasses[size]
        )}
        style={{ 
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '-0.01em',
          marginLeft: '-2px'
        }}
      >
        exSpace
      </span>
    </div>
  );
}
