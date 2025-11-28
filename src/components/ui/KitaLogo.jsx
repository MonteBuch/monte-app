// src/components/ui/KitaLogo.jsx
export default function KitaLogo({ size = 36 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Figur 1 */}
      <circle cx="14" cy="18" r="6" fill="#F4C542" />
      <path d="M8 34c0-6 4-10 6-10s6 4 6 10v12H8V34z" fill="#F4C542" />

      {/* Figur 2 */}
      <circle cx="32" cy="16" r="7" fill="#E58A2A" />
      <path d="M24 36c0-7 5-12 8-12s8 5 8 12v16H24V36z" fill="#E58A2A" />

      {/* Figur 3 */}
      <circle cx="50" cy="19" r="6" fill="#9EC95D" />
      <path d="M44 34c0-6 4-10 6-10s6 4 6 10v12H44V34z" fill="#9EC95D" />

      {/* Figur 4 */}
      <circle cx="24" cy="26" r="5" fill="#4FB0E6" />
      <path d="M19 38c0-5 3-8 5-8s5 3 5 8v10H19V38z" fill="#4FB0E6" />
    </svg>
  );
}