import type { ButtonHTMLAttributes } from "react"

export function Button({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`min-h-touch rounded-control bg-accent px-5 font-semibold text-white ${className}`}
      {...props}
    />
  )
}
