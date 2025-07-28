import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MobileFormProps {
  title: string;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  className?: string;
}

export const MobileForm: React.FC<MobileFormProps> = ({ title, children, onSubmit, className }) => {
  return (
    <Card className={cn("w-full max-w-full", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg sm:text-xl font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="form-mobile">
          {children}
        </form>
      </CardContent>
    </Card>
  );
};

interface MobileFormFieldProps {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  error?: string;
  className?: string;
}

export const MobileFormField: React.FC<MobileFormFieldProps> = ({
  label,
  children,
  required = false,
  error,
  className,
}) => {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm sm:text-base font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {children}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};

interface MobileFormRowProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileFormRow: React.FC<MobileFormRowProps> = ({ children, className }) => {
  return <div className={cn("form-row-mobile", className)}>{children}</div>;
};

interface MobileFormActionsProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileFormActions: React.FC<MobileFormActionsProps> = ({ children, className }) => {
  return (
    <div className={cn("flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4", className)}>{children}</div>
  );
};

// Enhanced mobile-friendly input components
interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const MobileInput: React.FC<MobileInputProps> = ({ label, error, className, ...props }) => {
  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-sm sm:text-base font-medium">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Input
        {...props}
        className={cn(
          "mobile-touch h-12 sm:h-10 text-base sm:text-sm",
          error && "border-red-500 focus:border-red-500",
          className
        )}
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};

interface MobileTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const MobileTextarea: React.FC<MobileTextareaProps> = ({
  label,
  error,
  className,
  ...props
}) => {
  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-sm sm:text-base font-medium">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Textarea
        {...props}
        className={cn(
          "min-h-[100px] text-base sm:text-sm resize-none",
          error && "border-red-500 focus:border-red-500",
          className
        )}
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};

interface MobileSelectProps {
  label?: string;
  error?: string;
  placeholder?: string;
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const MobileSelect: React.FC<MobileSelectProps> = ({
  label,
  error,
  placeholder,
  value,
  onValueChange,
  children,
  className,
}) => {
  return (
    <div className="space-y-2">
      {label && <Label className="text-sm sm:text-base font-medium">{label}</Label>}
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          className={cn(
            "mobile-touch h-12 sm:h-10 text-base sm:text-sm",
            error && "border-red-500 focus:border-red-500",
            className
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-[200px] overflow-y-auto">{children}</SelectContent>
      </Select>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};

interface MobileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: React.ReactNode;
}

export const MobileButton: React.FC<MobileButtonProps> = ({
  variant = "primary",
  size = "md",
  loading = false,
  children,
  className,
  disabled,
  ...props
}) => {
  const variants = {
    primary: "btn-mobile-primary",
    secondary: "btn-mobile-secondary",
    outline: "btn-mobile border border-input bg-background hover:bg-accent",
    ghost: "btn-mobile hover:bg-accent hover:text-accent-foreground",
  };

  const sizes = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-3 sm:px-3 sm:py-2",
    lg: "px-6 py-4 sm:px-4 sm:py-3 text-lg sm:text-base",
  };

  return (
    <Button
      {...props}
      disabled={disabled || loading}
      className={cn(
        variants[variant],
        sizes[size],
        "mobile-touch transition-all duration-200",
        loading && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </Button>
  );
};
