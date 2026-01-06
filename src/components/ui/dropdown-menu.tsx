import * as React from "react";
import { createPortal } from "react-dom";

// Global context to ensure only one menu is open at a time
const DropdownMenuContext = React.createContext<{
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  triggerRect: DOMRect | null;
  setTriggerRect: (rect: DOMRect | null) => void;
}>({
  openMenuId: null,
  setOpenMenuId: () => { },
  triggerRect: null,
  setTriggerRect: () => { },
});

export const DropdownMenuProvider = ({ children }: { children: React.ReactNode }) => {
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const [triggerRect, setTriggerRect] = React.useState<DOMRect | null>(null);

  return (
    <DropdownMenuContext.Provider value={{ openMenuId, setOpenMenuId, triggerRect, setTriggerRect }}>
      {children}
    </DropdownMenuContext.Provider>
  );
};

const DropdownMenu = ({ children }: { children: React.ReactNode }) => {
  const menuId = React.useId();
  const { openMenuId, setOpenMenuId, setTriggerRect } = React.useContext(DropdownMenuContext);
  const open = openMenuId === menuId;

  const setOpen = React.useCallback((newOpen: boolean, rect?: DOMRect) => {
    setOpenMenuId(newOpen ? menuId : null);
    if (newOpen && rect) {
      setTriggerRect(rect);
    }
  }, [menuId, setOpenMenuId, setTriggerRect]);

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
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean; open?: boolean; setOpen?: (open: boolean, rect?: DOMRect) => void }
>(({ className = '', children, asChild, open, setOpen, ...props }, ref) => {
  const innerRef = React.useRef<HTMLButtonElement>(null);
  const combinedRef = (ref as any) || innerRef;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setOpen?.(!open, rect);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: handleClick,
      ref: combinedRef
    } as any);
  }

  return (
    <button
      ref={combinedRef}
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
  React.HTMLAttributes<HTMLDivElement> & { open?: boolean; setOpen?: (open: boolean) => void; align?: 'start' | 'end' | 'center' }
>(({ className = '', children, open, setOpen, align = 'start', ...props }, ref) => {
  const { triggerRect } = React.useContext(DropdownMenuContext);

  React.useEffect(() => {
    if (!open) return;

    const handleClickOutside = () => setOpen?.(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [open, setOpen]);

  if (!open || !triggerRect) return null;

  const style: React.CSSProperties = {
    position: 'fixed',
    top: `${triggerRect.bottom + 8}px`,
    zIndex: 9999,
  };

  if (align === 'start') {
    style.left = `${triggerRect.left}px`;
  } else if (align === 'end') {
    style.right = `${window.innerWidth - triggerRect.right}px`;
  } else {
    style.left = `${triggerRect.left + triggerRect.width / 2}px`;
    style.transform = 'translateX(-50%)';
  }

  return createPortal(
    <div
      ref={ref}
      style={style}
      className={`min-w-[8rem] overflow-hidden rounded-md border bg-white dark:bg-gray-800 p-1 text-gray-950 dark:text-gray-50 shadow-lg animate-in fade-in zoom-in-95 duration-100 ${className}`}
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      {children}
    </div>,
    document.body
  );
});
DropdownMenuContent.displayName = "DropdownMenuContent";

const DropdownMenuItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { setOpen?: (open: boolean) => void; onSelect?: () => void }
>(({ className = '', children, setOpen, onClick, onSelect, ...props }, ref) => {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    onClick?.(e);
    onSelect?.();
    setOpen?.(false);
  };

  return (
    <div
      ref={ref}
      className={`relative flex cursor-pointer select-none rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 ${className}`}
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
