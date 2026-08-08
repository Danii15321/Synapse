import type { InputHTMLAttributes } from "react"

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  // États visuels centralisés dans globals.css : focus-visible:, disabled:.
  return <input className={`ui-input ${className}`.trim()} {...props} />
}
