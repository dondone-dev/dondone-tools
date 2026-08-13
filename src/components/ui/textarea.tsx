import * as React from "react"

import { cn } from "@/lib/utils"
import { textareaVariants, type TextareaVariantProps } from "./textarea-variants"

function Textarea({ className, variant, ...props }: React.ComponentProps<"textarea"> & TextareaVariantProps) {
  return (
    <textarea
      data-slot="textarea"
      data-variant={variant ?? "default"}
      className={cn(textareaVariants({ variant, className }))}
      {...props}
    />
  )
}

export { Textarea }
