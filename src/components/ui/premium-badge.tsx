type PremiumBadgeProps = Readonly<{
  className?: string
}>

export function PremiumBadge({ className = "" }: PremiumBadgeProps) {
  return (
    <span className={`premium-badge ${className}`.trim()}>
      <svg
        focusable="false"
        height="14"
        role="presentation"
        viewBox="0 0 16 16"
        width="14"
      >
        <path
          d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2M3 7h10v7H3z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Premium
    </span>
  )
}
