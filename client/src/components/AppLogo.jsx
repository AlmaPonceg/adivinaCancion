export default function AppLogo({ className = "w-8 h-8", alt = "Hitpop!" }) {
  return (
    <img
      src="/logo.png"
      alt={alt}
      width={128}
      height={128}
      className={`${className} object-contain shrink-0 select-none drop-shadow-xs`}
    />
  );
}
