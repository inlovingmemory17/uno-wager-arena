import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { useSound } from "@/hooks/useSound"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        hero:
          "bg-primary text-primary-foreground shadow-lg hover:brightness-110 active:translate-y-px transition-transform",
        neon: "border border-primary text-primary hover:bg-primary/10",
        game:
          "relative isolate bg-[linear-gradient(to_bottom,hsl(var(--primary)),hsl(var(--primary)/0.85))] text-primary-foreground border border-[hsl(var(--primary)/0.8)] shadow-[0_6px_0_hsl(var(--primary)/0.5),0_12px_20px_hsl(var(--primary)/0.25)] before:content-[''] before:absolute before:inset-x-1 before:top-1 before:h-1/3 before:rounded-md before:bg-[hsl(var(--uno-white)/0.18)] hover:brightness-105 active:translate-y-[2px] active:shadow-[0_4px_0_hsl(var(--primary)/0.5),0_8px_16px_hsl(var(--primary)/0.2)] transition-transform",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-14 rounded-lg px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, onClick, ...props }, ref) => {
    const { playClick } = useSound();
    const Comp = asChild ? Slot : "button";
    const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
      if (!props.disabled) playClick();
      onClick?.(e);
    };
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onClick={handleClick}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
