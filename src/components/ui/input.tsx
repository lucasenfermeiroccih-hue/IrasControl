import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border border-input bg-card/70 px-3 py-2 text-base ring-offset-background transition-[border-color,box-shadow] duration-300 ease-spectra file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground hover:border-primary/30 focus-visible:outline-none focus-visible:border-primary/60 focus-visible:shadow-[0_0_0_4px_hsl(var(--ring)/0.14),0_0_24px_hsl(var(--glow)/0.18)] disabled:cursor-not-allowed disabled:opacity-40 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
