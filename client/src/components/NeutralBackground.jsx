/**
 * NeutralBackground — Universal daytime festival ambient backdrop.
 *
 * Designed for public arcade & multiplayer gameplay:
 * - Ultra-lightweight: CSS radial & conic gradients with subtle animated drift.
 * - Zero CPU/GPU streaming overhead.
 * - Hardware-accelerated ambient glows complementing the arcade design system.
 */
export default function NeutralBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none no-print"
      style={{
        width: '100vw',
        height: '100dvh',
        minHeight: '-webkit-fill-available',
        backgroundColor: '#F7F4EE',
      }}
    >
      {/* ── Soft Ambient Daytime Sun Orbs ── */}
      <div
        className="absolute -top-[15%] left-[10%] w-[42rem] h-[42rem] rounded-full blur-3xl pointer-events-none opacity-40 animate-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(255, 87, 34, 0.18) 0%, rgba(255, 87, 34, 0) 70%)',
          animationDuration: '8s',
        }}
      />
      <div
        className="absolute top-[25%] -right-[15%] w-[38rem] h-[38rem] rounded-full blur-3xl pointer-events-none opacity-35"
        style={{
          background: 'radial-gradient(circle, rgba(225, 29, 72, 0.15) 0%, rgba(225, 29, 72, 0) 70%)',
        }}
      />
      <div
        className="absolute -bottom-[20%] left-[25%] w-[45rem] h-[45rem] rounded-full blur-3xl pointer-events-none opacity-30"
        style={{
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.16) 0%, rgba(245, 158, 11, 0) 70%)',
        }}
      />

      {/* ── Subtle Geometric Mesh Grain Overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 90% 60% at 50% -10%, rgba(255, 87, 34, 0.08) 0%, transparent 60%),
            radial-gradient(circle at 100% 100%, rgba(79, 70, 229, 0.04) 0%, transparent 50%),
            rgba(247, 244, 238, 0.4)
          `,
        }}
      />
    </div>
  );
}
