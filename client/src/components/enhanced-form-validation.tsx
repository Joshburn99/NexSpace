import React from "react";
import { useFormContext } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle, Info, X } from "lucide-react";

// Enhanced input with validation states
export function ValidatedInput({
  name,
  label,
  required = false,
  placeholder,
  type = "text",
  className = "",
  ...props
}: {
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  type?: string;
  className?: string;
  [key: string]: any;
}) {
  const { register, formState: { errors }, watch } = useFormContext();
  const error = errors[name];
  const value = watch(name);
  const hasValue = value && value.length > 0;

  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      <div className="relative">
        <Input
          {...register(name)}
          id={name}
          type={type}
          placeholder={placeholder}
          className={cn(
            "transition-all duration-200",
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
              : hasValue
              ? "border-green-500 focus:border-green-500 focus:ring-green-500"
              : "border-gray-300 focus:border-blue-500 focus:ring-blue-500",
            className
          )}
          {...props}
        />
        
        {/* Validation icons */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {error && (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          )}
          {!error && hasValue && (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {error.message as string}
        </p>
      )}
    </div>
  );
}

// Enhanced textarea with validation
export function ValidatedTextarea({
  name,
  label,
  required = false,
  placeholder,
  maxLength,
  className = "",
  ...props
}: {
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  [key: string]: any;
}) {
  const { register, formState: { errors }, watch } = useFormContext();
  const error = errors[name];
  const value = watch(name) || "";
  const hasValue = value.length > 0;
  const charCount = value.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={name} className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {maxLength && (
          <Badge variant="outline" className="text-xs">
            {charCount}/{maxLength}
          </Badge>
        )}
      </div>
      
      <div className="relative">
        <Textarea
          {...register(name)}
          id={name}
          placeholder={placeholder}
          maxLength={maxLength}
          className={cn(
            "transition-all duration-200 min-h-[100px]",
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
              : hasValue
              ? "border-green-500 focus:border-green-500 focus:ring-green-500"
              : "border-gray-300 focus:border-blue-500 focus:ring-blue-500",
            className
          )}
          {...props}
        />
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {error.message as string}
        </p>
      )}
    </div>
  );
}

// Form error summary
export function FormErrorSummary() {
  const { formState: { errors } } = useFormContext();
  const errorCount = Object.keys(errors).length;

  if (errorCount === 0) return null;

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <div className="font-medium mb-2">
          Please fix {errorCount} error{errorCount > 1 ? 's' : ''} before continuing:
        </div>
        <ul className="list-disc list-inside space-y-1 text-sm">
          {Object.entries(errors).map(([field, error]: [string, any]) => (
            <li key={field}>
              {field.charAt(0).toUpperCase() + field.slice(1)}: {error.message}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

// Success message component
export function SuccessMessage({ 
  message, 
  onDismiss,
  autoHide = true
}: { 
  message: string; 
  onDismiss?: () => void;
  autoHide?: boolean;
}) {
  React.useEffect(() => {
    if (autoHide && onDismiss) {
      const timer = setTimeout(onDismiss, 5000);
      return () => clearTimeout(timer);
    }
  }, [autoHide, onDismiss]);

  return (
    <Alert className="border-green-200 bg-green-50 text-green-800">
      <CheckCircle className="h-4 w-4 text-green-600" />
      <AlertDescription className="flex items-center justify-between">
        <span>{message}</span>
        {onDismiss && (
          <button 
            onClick={onDismiss}
            className="text-green-600 hover:text-green-800 ml-2"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </AlertDescription>
    </Alert>
  );
}

// Field validation helpers
export const validationRules = {
  required: (fieldName: string) => ({
    required: `${fieldName} is required`
  }),
  
  email: {
    required: "Email is required",
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: "Please enter a valid email address"
    }
  },
  
  phone: {
    pattern: {
      value: /^[\+]?[1-9][\d]{0,15}$/,
      message: "Please enter a valid phone number"
    }
  },
  
  password: {
    required: "Password is required",
    minLength: {
      value: 8,
      message: "Password must be at least 8 characters"
    }
  },
  
  name: (fieldName: string) => ({
    required: `${fieldName} is required`,
    minLength: {
      value: 2,
      message: `${fieldName} must be at least 2 characters`
    },
    pattern: {
      value: /^[a-zA-Z\s]+$/,
      message: `${fieldName} should only contain letters and spaces`
    }
  }),
  
  number: (fieldName: string, min?: number, max?: number) => ({
    required: `${fieldName} is required`,
    valueAsNumber: true,
    min: min ? {
      value: min,
      message: `${fieldName} must be at least ${min}`
    } : undefined,
    max: max ? {
      value: max,
      message: `${fieldName} cannot exceed ${max}`
    } : undefined
  })
};

// Real-time validation feedback
export function ValidationFeedback({ 
  field, 
  value, 
  rules 
}: { 
  field: string; 
  value: any; 
  rules: any;
}) {
  const [feedback, setFeedback] = React.useState<{
    type: 'error' | 'warning' | 'success' | 'info';
    message: string;
  } | null>(null);

  React.useEffect(() => {
    if (!value || value.length === 0) {
      setFeedback(null);
      return;
    }

    // Check validation rules
    if (rules.pattern && !rules.pattern.value.test(value)) {
      setFeedback({
        type: 'error',
        message: rules.pattern.message
      });
      return;
    }

    if (rules.minLength && value.length < rules.minLength.value) {
      setFeedback({
        type: 'warning',
        message: `${rules.minLength.value - value.length} more characters needed`
      });
      return;
    }

    setFeedback({
      type: 'success',
      message: 'Looks good!'
    });
  }, [value, rules]);

  if (!feedback) return null;

  const icons = {
    error: AlertTriangle,
    warning: Info,
    success: CheckCircle,
    info: Info
  };

  const colors = {
    error: 'text-red-600',
    warning: 'text-yellow-600',
    success: 'text-green-600',
    info: 'text-blue-600'
  };

  const Icon = icons[feedback.type];

  return (
    <p className={cn('text-sm flex items-center gap-1 mt-1', colors[feedback.type])}>
      <Icon className="h-3 w-3" />
      {feedback.message}
    </p>
  );
}