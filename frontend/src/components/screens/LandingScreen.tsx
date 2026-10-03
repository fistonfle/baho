import { ActionButton } from '../ui';

export function LandingScreen({ onStart, onAdmin }: { onStart: () => void; onAdmin: () => void }) {
  return (
    <div className="screen landing-page">
      <header className="landing-header">
        <a className="brand-mark" href="#home" aria-label="Baho ahabanza">
          <span className="brand-symbol" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M16 27s-10-6.1-10-13.1A5.9 5.9 0 0 1 16 10a5.9 5.9 0 0 1 10 3.9C26 20.9 16 27 16 27Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
              <path d="M8.5 16h4l2-4 3.1 8 2.1-4h3.8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span>BAHO<span className="brand-period">.</span></span>
        </a>
        <div className="landing-header-actions">
          <span className="language-label"><span className="language-dot" /> Ikinyarwanda</span>
          <ActionButton variant="ghost" onClick={onAdmin}>Injira muri konti</ActionButton>
        </div>
      </header>

      <main id="home">
        <section className="landing-hero">
          <div className="landing-copy">
            <div className="hero-kicker"><span /> Amakuru y'ubuzima yizewe, mu Kinyarwanda</div>
            <h1>Ubuzima bwiza butangirira ku <span>makuru meza.</span></h1>
            <p className="hero-description">Menya uko warinda indwara zidakira, wige ku buzima bwawe, kandi utere intambwe nto buri munsi.</p>
            <div className="landing-cta">
              <ActionButton onClick={onStart} className="hero-primary">Tangira kwiga <span aria-hidden="true">→</span></ActionButton>
              <span className="hero-note">Ubuntu. Byoroshye. Mu rurimi rwawe.</span>
            </div>
            <div className="landing-proof">
              <span className="proof-check" aria-hidden="true">✓</span>
              <span>Wige ku muvuduko w'amaraso, diyabete n'ubuzima bw'umutima</span>
            </div>
          </div>

          <div className="hero-art" aria-label="Igishushanyo cy'ubuzima bwiza" role="img">
            <div className="art-orbit art-orbit-one" />
            <div className="art-orbit art-orbit-two" />
            <div className="art-sun" />
            <div className="art-leaf art-leaf-one" />
            <div className="art-leaf art-leaf-two" />
            <div className="art-main-card">
              <div className="art-card-top"><span className="art-pulse-icon">+</span><span>INAMA Y'UYU MUNSI</span></div>
              <div className="art-heart-wrap">
                <svg viewBox="0 0 180 140" fill="none" aria-hidden="true">
                  <path d="M90 119S23 79 23 42C23 8 66 1 90 34 114 1 157 8 157 42c0 37-67 77-67 77Z" fill="#D9F1E9" stroke="#1D806B" strokeWidth="3" />
                  <path d="M41 65h27l11-22 19 49 13-27h29" stroke="#13816D" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p>Intambwe nto zubaka ubuzima bwiza.</p>
              <div className="art-progress"><span /></div>
              <span className="art-card-caption">Wige ku buzima bwawe buri munsi</span>
            </div>
            <div className="art-float-tag art-float-top"><span className="float-dot" /> Kwiga mu Kinyarwanda</div>
            <div className="art-float-tag art-float-bottom"><span className="float-spark">+</span> Imenye. Irinde. Itere imbere.</div>
          </div>
        </section>

        <section className="landing-features" aria-labelledby="features-title">
          <div className="features-heading">
            <div>
              <p className="eyebrow">UBUFASHA BWA BAHO</p>
              <h2 id="features-title">Ubuzima bwawe, intambwe ku yindi</h2>
            </div>
            <p>Ibikoresho byoroheje bigufasha kumenya byinshi no gufata ingamba zikwiriye.</p>
          </div>
          <div className="feature-grid">
            <article className="feature-card">
              <span className="feature-icon feature-icon-green" aria-hidden="true">01</span>
              <div><h3>Wige ibikureba</h3><p>Amakuru asobanutse ku ndwara zidakira n'uburyo bwo kuzirinda.</p></div>
              <span className="feature-arrow" aria-hidden="true">↗</span>
            </article>
            <article className="feature-card">
              <span className="feature-icon feature-icon-gold" aria-hidden="true">02</span>
              <div><h3>Umva amasomo</h3><p>Kurikirana amasomo y'ubuzima mu buryo bworoshye, aho uri hose.</p></div>
              <span className="feature-arrow" aria-hidden="true">↗</span>
            </article>
            <article className="feature-card">
              <span className="feature-icon feature-icon-blue" aria-hidden="true">03</span>
              <div><h3>Ibuka intego zawe</h3><p>Shyiraho ibibutsa kandi ukurikirane amasomo umaze kurangiza.</p></div>
              <span className="feature-arrow" aria-hidden="true">↗</span>
            </article>
          </div>
        </section>
      </main>

      <footer className="landing-footer"><span>BAHO<span className="brand-period">.</span></span><span>Amakuru meza. Ubuzima bwiza.</span></footer>
    </div>
  );
}
