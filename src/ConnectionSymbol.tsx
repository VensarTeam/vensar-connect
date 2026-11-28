export function ConnectionSymbol() {
  return (
    <svg className="connection-symbol" viewBox="0 0 42 36" aria-hidden="true" focusable="false">
      <g className="connection-links">
        <path d="M4 4 C16 4 20 18 29 18" />
        <path d="M4 11 C16 11 22 18 29 18" />
        <path d="M4 18 H29" />
        <path d="M4 25 C16 25 22 18 29 18" />
        <path d="M4 32 C16 32 20 18 29 18" />
      </g>
      <g className="connection-flows">
        <path pathLength="100" d="M4 4 C16 4 20 18 29 18" />
        <path pathLength="100" d="M4 11 C16 11 22 18 29 18" />
        <path pathLength="100" d="M4 18 H29" />
        <path pathLength="100" d="M4 25 C16 25 22 18 29 18" />
        <path pathLength="100" d="M4 32 C16 32 20 18 29 18" />
      </g>
      <g className="connection-sources">
        <circle cx="4" cy="4" r="1.8" />
        <circle cx="4" cy="11" r="1.8" />
        <circle cx="4" cy="18" r="1.8" />
        <circle cx="4" cy="25" r="1.8" />
        <circle cx="4" cy="32" r="1.8" />
      </g>
      <circle className="connection-hub-ring" cx="33" cy="18" r="5" />
      <circle className="connection-hub" cx="33" cy="18" r="2.1" />
    </svg>
  )
}
