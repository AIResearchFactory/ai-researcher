import * as React from "react";

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  decorative?: boolean;
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className = '', orientation = 'horizontal', decorative = true, ...props }, ref) => {
    const baseStyles = "shrink-0 bg-gray-200 dark:bg-gray-800";

    const orientationStyles = {
      horizontal: "h-[1px] w-full",
      vertical: "h-full w-[1px]",
    };

    return (
      <div
        ref={ref}
        role={decorative ? 'none' : 'separator'}
        aria-orientation={orientation}
        className={`${baseStyles} ${orientationStyles[orientation]} ${className}`}
        {...props}
      />
    );
  }
);
Separator.displayName = "Separator";

export { Separator };
