const c = {
  ivory: '#FBF8F2',
  forest: '#2A4A35',
};

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <img
        src="/images/logo-mark.png"
        alt=""
        aria-hidden="true"
        style={{
          width: 64,
          height: 40,
          objectFit: 'contain',
          flexShrink: 0,
        }}
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
