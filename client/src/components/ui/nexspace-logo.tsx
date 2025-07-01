import { cn } from "@/lib/utils";

interface NexSpaceLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "full" | "icon" | "horizontal";
}

export function NexSpaceLogo({ 
  className, 
  size = "md", 
  variant = "full" 
}: NexSpaceLogoProps) {
  const sizeClasses = {
    sm: "w-12 h-16",
    md: "w-16 h-20", 
    lg: "w-20 h-24"
  };

  const iconSizes = {
    sm: { width: 48, height: 48 },
    md: { width: 64, height: 64 },
    lg: { width: 80, height: 80 }
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl"
  };

  if (variant === "icon") {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <svg
          width={iconSizes[size].width}
          height={iconSizes[size].height}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="nexspace-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="50%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#1E40AF" />
            </linearGradient>
          </defs>
          <path
            d="M20 15 C15 15, 10 20, 10 25 L10 75 C10 80, 15 85, 20 85 L35 85 C40 85, 45 80, 45 75 L45 50 L70 85 C75 90, 85 85, 85 75 L85 25 C85 20, 80 15, 75 15 L60 15 C55 15, 50 20, 50 25 L50 50 L25 15 C22.5 12.5, 20 15, 20 15 Z"
            fill="url(#nexspace-gradient)"
          />
        </svg>
      </div>
    );
  }

  if (variant === "horizontal") {
    return (
      <div className={cn("flex items-center space-x-3", className)}>
        <svg
          width={iconSizes[size].width}
          height={iconSizes[size].height}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="nexspace-gradient-h" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="50%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#1E40AF" />
            </linearGradient>
          </defs>
          <path
            d="M20 15 C15 15, 10 20, 10 25 L10 75 C10 80, 15 85, 20 85 L35 85 C40 85, 45 80, 45 75 L45 50 L70 85 C75 90, 85 85, 85 75 L85 25 C85 20, 80 15, 75 15 L60 15 C55 15, 50 20, 50 25 L50 50 L25 15 C22.5 12.5, 20 15, 20 15 Z"
            fill="url(#nexspace-gradient-h)"
          />
        </svg>
        <span className={cn("font-bold text-gray-800", textSizes[size])}>
          NEXSPACE
        </span>
      </div>
    );
  }

  // Full variant - icon above text
  return (
    <div className={cn("flex flex-col items-center", sizeClasses[size], className)}>
      <svg
        width={iconSizes[size].width}
        height={iconSizes[size].height}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mb-1"
      >
        <defs>
          <linearGradient id="nexspace-gradient-full" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>
        </defs>
        <path
          d="M20 15 C15 15, 10 20, 10 25 L10 75 C10 80, 15 85, 20 85 L35 85 C40 85, 45 80, 45 75 L45 50 L70 85 C75 90, 85 85, 85 75 L85 25 C85 20, 80 15, 75 15 L60 15 C55 15, 50 20, 50 25 L50 50 L25 15 C22.5 12.5, 20 15, 20 15 Z"
          fill="url(#nexspace-gradient-full)"
        />
      </svg>
      <span className={cn("font-bold text-gray-800 leading-tight", textSizes[size])}>
        NEXSPACE
      </span>
    </div>
  );
}