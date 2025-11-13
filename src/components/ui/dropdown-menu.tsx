import * as React from "react";

// Global context to ensure only one menu is open at a time
const DropdownMenuContext = React.createContext<{
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
}>({
  openMenuId: null,
  setOpenMenuId: () => {},
});

export const DropdownMenuProvider = ({ children }: { children: React.ReactNode }) => {
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  return (
    <DropdownMenuContext.Provider value={{ openMenuId, setOpenMenuId }}>
      {children}
    </DropdownMenuContext.Provider>
  );
};

const DropdownMenu = ({ children }: { children: React.ReactNode }) => {
  const menuId = React.useId();
  const { openMenuId, setOpenMenuId } = React.useContext(DropdownMenuContext);
  const open = openMenuId === menuId;

  const setOpen = React.useCallback((newOpen: boolean) => {
    setOpenMenuId(newOpen ? menuId : null);
  }, [menuId, setOpenMenuId]);

  return (
    <div className="relative inline-block">
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { open, setOpen } as any);
        }
        return child;
      })}
    </div>
  );
};

const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean; open?: boolean; setOpen?: (open: boolean) => void }
>(({ className = '', children, asChild, open, setOpen, ...props }, ref) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen?.(!open);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { onClick: handleClick } as any);
  }

  return (
    <button
      ref={ref}
      className={className}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
});
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { open?: boolean; setOpen?: (open: boolean) => void }
>(({ className = '', children, open, setOpen, ...props }, ref) => {
  React.useEffect(() => {
    if (!open) return;

    const handleClickOutside = () => setOpen?.(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={`absolute z-50 mt-2 min-w-[8rem] overflow-hidden rounded-md border bg-white dark:bg-gray-800 p-1 text-gray-950 dark:text-gray-50 shadow-md ${className}`}
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      {children}
    </div>
  );
});
DropdownMenuContent.displayName = "DropdownMenuContent";

const DropdownMenuItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { setOpen?: (open: boolean) => void }
>(({ className = '', children, setOpen, onClick, ...props }, ref) => {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    onClick?.(e);
    setOpen?.(false);
  };

  return (
    <div
      ref={ref}
      className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 ${className}`}
      onClick={handleClick}
      {...props}
    >
      {children}
    </div>
  );
});
DropdownMenuItem.displayName = "DropdownMenuItem";

const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`-mx-1 my-1 h-px bg-gray-200 dark:bg-gray-700 ${className}`}
    {...props}
  />
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`px-2 py-1.5 text-sm font-semibold ${className}`}
    {...props}
  />
));
DropdownMenuLabel.displayName = "DropdownMenuLabel";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
};
