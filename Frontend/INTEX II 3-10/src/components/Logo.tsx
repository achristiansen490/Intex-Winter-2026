const c = {
  ivory: '#FBF8F2',
  forest: '#2A4A35',
  gold: '#D4A44C',
};

function SampaguitaIcon({
  size = 32,
  bg,
  petalColor,
  centerColor,
}: {
  size?: number;
  bg: string;
  petalColor: string;
  centerColor: string;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 24 24" focusable="false">
        {[0, 60, 120, 180, 240, 300].map((angle, i) => (
          <ellipse
            key={i}
            cx={12 + 5.5 * Math.cos(((angle - 90) * Math.PI) / 180)}
            cy={12 + 5.5 * Math.sin(((angle - 90) * Math.PI) / 180)}
            rx="2.8"
            ry="4.2"
            fill={petalColor}
            opacity="0.92"
            transform={`rotate(${angle},${12 + 5.5 * Math.cos(((angle - 90) * Math.PI) / 180)},${12 + 5.5 * Math.sin(((angle - 90) * Math.PI) / 180)})`}
          />
        ))}
        <circle cx="12" cy="12" r="3" fill={centerColor} />
        <circle cx="12" cy="12" r="1.4" fill={petalColor} opacity="0.6" />
      </svg>
    </div>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <SampaguitaIcon
        size={32}
        bg={light ? c.gold : c.forest}
        petalColor={light ? c.forest : c.ivory}
        centerColor={light ? c.forest : c.gold}
      />
      <span
        style={{
          fontFamily: 'Georgia, serif',
          fontSize: 16,
          fontWeight: 400,
          color: light ? c.ivory : c.forest,
          letterSpacing: '0.01em',
        }}
      >
        Hiraya Haven
      </span>
    </div>
  );
}
