import * as React from "react";

const Tabs = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { defaultValue?: string; value?: string; onValueChange?: (value: string) => void }
>(({ className = '', children, defaultValue, value, onValueChange, ...props }, ref) => {
  const [selectedValue, setSelectedValue] = React.useState(defaultValue || '');

  const currentValue = value !== undefined ? value : selectedValue;

  const handleValueChange = (newValue: string) => {
    if (value === undefined) {
      setSelectedValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <div ref={ref} className={className} {...props}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { value: currentValue, onValueChange: handleValueChange } as any);
        }
        return child;
      })}
    </div>
  );
});
Tabs.displayName = "Tabs";

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 p-1 text-gray-500 dark:text-gray-400 ${className}`}
    {...props}
  />
));
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string; isActive?: boolean; onTabClick?: (value: string) => void }
>(({ className = '', value, isActive, onTabClick, ...props }, ref) => (
  <button
    ref={ref}
    className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
      isActive
        ? 'bg-white dark:bg-gray-900 text-gray-950 dark:text-gray-50 shadow-sm'
        : 'hover:bg-gray-200 dark:hover:bg-gray-700'
    } ${className}`}
    onClick={() => onTabClick?.(value)}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string; isActive?: boolean }
>(({ className = '', value, isActive, ...props }, ref) => {
  if (!isActive) return null;

  return (
    <div
      ref={ref}
      className={`mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${className}`}
      {...props}
    />
  );
});
TabsContent.displayName = "TabsContent";

// Enhanced exports with proper prop forwarding
const TabsWithContext = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof Tabs>>(
  (props, ref) => <Tabs ref={ref} {...props} />
);
TabsWithContext.displayName = "Tabs";

const TabsListWithContext = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof TabsList> & { value?: string; onValueChange?: (value: string) => void }>(
  ({ value, onValueChange, children, ...props }, ref) => (
    <TabsList ref={ref} {...props}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child) && child.type === TabsTrigger) {
          return React.cloneElement(child, {
            isActive: child.props.value === value,
            onTabClick: onValueChange,
          } as any);
        }
        return child;
      })}
    </TabsList>
  )
);
TabsListWithContext.displayName = "TabsList";

const TabsContentWithContext = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof TabsContent> & { value: string; currentValue?: string }>(
  ({ value, currentValue, ...props }, ref) => (
    <TabsContent ref={ref} value={value} isActive={value === currentValue} {...props} />
  )
);
TabsContentWithContext.displayName = "TabsContent";

export { TabsWithContext as Tabs, TabsListWithContext as TabsList, TabsTrigger, TabsContentWithContext as TabsContent };
