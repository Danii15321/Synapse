import type { ButtonHTMLAttributes, ReactNode } from "react"

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  Readonly<{
    isLoading?: boolean
    loadingLabel?: ReactNode
  }>

export function Button({
  children,
  className = "",
  disabled,
  isLoading = false,
  loadingLabel = "Chargement…",
  ...props
}: ButtonProps) {
  // États visuels centralisés dans globals.css : hover:, focus-visible:, disabled:.
  return (
    <button
      aria-busy={isLoading || undefined}
      className={`ui-button min-h-touch ${className}`.trim()}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? loadingLabel : children}
    </button>
  )
}
