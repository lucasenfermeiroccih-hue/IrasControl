import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-xl border border-input bg-card/70 px-3 py-2 text-sm ring-offset-background transition-[border-color,box-shadow] duration-300 ease-spectra placeholder:text-muted-foreground hover:border-primary/30 focus-visible:outline-none focus-visible:border-primary/60 focus-visible:shadow-[0_0_0_4px_hsl(var(--ring)/0.14),0_0_24px_hsl(var(--glow)/0.18)] disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
