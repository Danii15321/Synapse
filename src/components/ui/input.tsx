import type { InputHTMLAttributes } from "react"

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`min-h-touch w-full rounded-control border bg-surface px-3 text-foreground ${className}`}
      {...props}
    />
  )
}
