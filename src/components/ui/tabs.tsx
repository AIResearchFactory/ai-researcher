import * as React from "react";
import { createContext, useContext, useState, forwardRef } from "react";

interface TabsContextType {
  currentValue: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

const Tabs = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { defaultValue?: string; value?: string; onValueChange?: (value: string) => void }
>(({ className = '', children, defaultValue, value, onValueChange, ...props }, ref) => {
  const [selectedValue, setSelectedValue] = useState(defaultValue || '');

  const currentValue = value !== undefined ? value : selectedValue;

  const handleValueChange = (newValue: string) => {
    if (value === undefined) {
      setSelectedValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ currentValue, onValueChange: handleValueChange }}>
      <div ref={ref} className={className} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
});
Tabs.displayName = "Tabs";

const TabsList = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = '', ...props }, ref) => (
  <div
    ref={ref}
    role="tablist"
    className={`inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground ${className}`}
    {...props}
  />
));
TabsList.displayName = "TabsList";

const TabsTrigger = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ className = '', value, onKeyDown, ...props }, ref) => {
  const context = useContext(TabsContext);
  if (!context) return <button ref={ref} {...props} />;

  const isActive = context.currentValue === value;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(e);
    if (!ref || typeof ref === 'function') return;

    const target = e.currentTarget;
    const parent = target.parentElement;
    if (!parent) return;

    const items = Array.from(parent.querySelectorAll('[role="tab"]')) as HTMLElement[];
    const index = items.indexOf(target);

    if (e.key === 'ArrowRight') {
      const next = items[(index + 1) % items.length];
      next?.focus();
      next?.click();
    } else if (e.key === 'ArrowLeft') {
      const prev = items[(index - 1 + items.length) % items.length];
      prev?.focus();
      prev?.click();
    }
  };

  return (
    <button
      ref={ref}
      role="tab"
      aria-selected={isActive}
      aria-controls={`panel-${value}`}
      id={`tab-${value}`}
      tabIndex={isActive ? 0 : -1}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${isActive
        ? 'bg-background text-foreground shadow-sm'
        : 'hover:bg-accent hover:text-accent-foreground'
        } ${className}`}
      onClick={() => context.onValueChange(value)}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
});
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className = '', value, ...props }, ref) => {
  const context = useContext(TabsContext);
  if (!context || context.currentValue !== value) return null;

  return (
    <div
      ref={ref}
      role="tabpanel"
      id={`panel-${value}`}
      aria-labelledby={`tab-${value}`}
      tabIndex={0}
      className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
      {...props}
    />
  );
});
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
