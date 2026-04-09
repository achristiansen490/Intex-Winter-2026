import { Link } from 'react-router-dom';
import { NavBar } from '../components/NavBar';
import { Logo } from '../components/Logo';
import MonthlyLineChart from '../components/charts/MonthlyLineChart';
import CampaignBarChart from '../components/charts/CampaignBarChart';

const c = {
  ivory: '#FBF8F2',
  roseLight: '#F0D8D4',
  sageLight: '#D4EAD9',
  forest: '#2A4A35',
  gold: '#D4A44C',
  goldLight: '#F5E6C8',
  text: '#2C2B28',
  muted: '#7A786F',
};

const monthlyImpact = [
  { month: 'Jan', total: 138000 },
  { month: 'Feb', total: 152500 },
  { month: 'Mar', total: 165200 },
  { month: 'Apr', total: 174800 },
  { month: 'May', total: 189300 },
  { month: 'Jun', total: 201700 },
];

const supportPrograms = [
  { name: 'Safehouse Care', total: 320000 },
  { name: 'Education', total: 185000 },
  { name: 'Counseling', total: 142000 },
  { name: 'Reintegration', total: 97000 },
];

const topStats = [
  ['312', 'Girls served this year'],
  ['12', 'Partner communities'],
  ['94%', 'Stayed in school'],
];

export default function ImpactPage() {
  return (
    <>
      <NavBar />
      <main id="main-content" style={{ background: c.ivory }}>
        <section
          aria-labelledby="impact-page-heading"
          style={{
            padding: '2.25rem 2.5rem 2rem',
            borderBottom: '0.5px solid rgba(44,43,40,0.12)',
          }}
        >
          <h1
            id="impact-page-heading"
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 'clamp(30px,5vw,48px)',
              fontWeight: 400,
              color: c.forest,
              margin: '0 0 0.75rem',
            }}
          >
            Every gift helps rebuild futures.
          </h1>
          <p style={{ maxWidth: 720, color: c.muted, lineHeight: 1.75, margin: 0 }}>
            This page shares sample impact highlights from our programs. Values are
            illustrative for demo purposes so visitors can quickly understand the
            kind of outcomes support makes possible.
          </p>
        </section>

        <section
          aria-label="Top impact metrics"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 14,
            padding: '2rem 2.5rem',
          }}
        >
          {topStats.map(([value, label], idx) => (
            <article
              key={label}
              style={{
                background: idx === 0 ? c.roseLight : idx === 1 ? c.sageLight : c.goldLight,
                borderRadius: 14,
                padding: '1.2rem 1.1rem',
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: c.forest,
                  fontFamily: 'Georgia, serif',
                  fontSize: 28,
                }}
              >
                {value}
              </p>
              <p style={{ margin: '0.35rem 0 0', color: c.text, fontSize: 13 }}>{label}</p>
            </article>
          ))}
        </section>

        <section style={{ padding: '0 2.5rem 2.5rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 18,
            }}
          >
            <article
              style={{
                background: '#fff',
                border: '0.5px solid rgba(44,43,40,0.12)',
                borderRadius: 14,
                padding: '1rem 1rem 0.35rem',
              }}
            >
              <h2
                style={{
                  margin: '0 0 0.75rem',
                  fontFamily: 'Georgia, serif',
                  fontWeight: 400,
                  color: c.forest,
                }}
              >
                Monthly support trend
              </h2>
              <MonthlyLineChart data={monthlyImpact} />
            </article>

            <article
              style={{
                background: '#fff',
                border: '0.5px solid rgba(44,43,40,0.12)',
                borderRadius: 14,
                padding: '1rem 1rem 0.35rem',
              }}
            >
              <h2
                style={{
                  margin: '0 0 0.75rem',
                  fontFamily: 'Georgia, serif',
                  fontWeight: 400,
                  color: c.forest,
                }}
              >
                Program allocation mix
              </h2>
              <CampaignBarChart data={supportPrograms} />
            </article>
          </div>
        </section>

        <section
          style={{
            background: c.forest,
            margin: '0 2.5rem 2.5rem',
            borderRadius: 14,
            padding: '1.75rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                color: c.ivory,
                fontFamily: 'Georgia, serif',
                fontWeight: 400,
              }}
            >
              Want to be part of this impact?
            </h2>
            <p style={{ margin: '0.35rem 0 0', color: 'rgba(251,248,242,0.75)', fontSize: 14 }}>
              Join as a supporter and help us reach more girls with safety and care.
            </p>
          </div>
          <Link
            to="/register"
            style={{
              background: c.gold,
              color: c.forest,
              textDecoration: 'none',
              borderRadius: 26,
              padding: '10px 20px',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Give Hope
          </Link>
        </section>

        <footer style={{ borderTop: '0.5px solid rgba(44,43,40,0.1)', padding: '1.5rem 2.5rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <Logo />
            <nav aria-label="Footer links">
              <ul
                style={{
                  display: 'flex',
                  gap: 20,
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                }}
              >
                <li>
                  <Link to="/" style={{ color: c.muted, textDecoration: 'none', fontSize: 13 }}>
                    Home
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" style={{ color: c.muted, textDecoration: 'none', fontSize: 13 }}>
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </nav>
            <p style={{ fontSize: 12, color: c.muted, margin: 0 }}>
              Demo metrics for public storytelling.
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
