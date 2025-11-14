import * as React from "react";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive';
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className = '', variant = 'default', ...props }, ref) => {
    const baseStyles = "relative w-full rounded-lg border p-4";

    const variantStyles = {
      default: "bg-white border-gray-200 text-gray-900 dark:bg-gray-950 dark:border-gray-800 dark:text-gray-50",
      destructive: "border-red-500/50 text-red-600 dark:border-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/20",
    };

    return (
      <div
        ref={ref}
        role="alert"
        className={`${baseStyles} ${variantStyles[variant]} ${className}`}
        {...props}
      />
    );
  }
);
Alert.displayName = "Alert";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`text-sm [&_p]:leading-relaxed ${className}`}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertDescription };
