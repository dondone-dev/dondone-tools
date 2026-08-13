import { cva, type VariantProps } from "class-variance-authority"

export const textareaVariants = cva(
  "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none resize-y overflow-y-auto placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      variant: {
        default: "h-32 min-h-32 max-h-96",
        compact: "h-24 min-h-24 max-h-64",
        editor: "h-64 min-h-64 max-h-[32rem]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export type TextareaVariantProps = VariantProps<typeof textareaVariants>
