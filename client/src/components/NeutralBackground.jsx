/**
 * NeutralBackground — Solid clean canvas background.
 *
 * Designed for public arcade & multiplayer gameplay:
 * - Solid warm linen/canvas tone (#F5F2EB) without artificial gradients or blur glows.
 * - Zero GPU streaming overhead and maximum readability.
 */
export default function NeutralBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none -z-10 select-none no-print bg-[#F5F2EB]"
      style={{
        width: '100vw',
        height: '100dvh',
        minHeight: '-webkit-fill-available',
      }}
    />
  );
}
