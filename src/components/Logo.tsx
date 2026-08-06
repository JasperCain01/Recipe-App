/** Small inline wordmark mark — a skillet with a wisp of steam — replacing the
 *  🍽 emoji in the header per 4.6 ("a small SVG wordmark/logo"). Inherits its
 *  colour from `currentColor` so it follows the header's text colour/theme. */
export default function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <ellipse cx="10" cy="15.5" rx="7" ry="3" />
      <path d="M17 15.5h4.5" />
      <path d="M7.2 8.4c0-1.4.9-1.9.9-3.2S7.2 2.6 7.2 2.6" opacity="0.7" />
      <path d="M11.2 8.4c0-1.4.9-1.9.9-3.2S11.2 2.6 11.2 2.6" opacity="0.7" />
    </svg>
  );
}
