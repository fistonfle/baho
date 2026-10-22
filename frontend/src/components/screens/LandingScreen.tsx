export function LandingScreen({ onStart, onAdmin, returning }: { onStart: () => void; onAdmin: () => void; returning: boolean }) {
  return (
    <>
      <section className="landing-banner">
        <div className="container">
          <div>
            <h1>Inyigisho ku ndwara zitandura, mu Kinyarwanda</h1>
            <p className="lead">
              Baho igufasha kumenya no kwirinda umuvuduko w'amaraso ukabije, diyabete, indwara z'umutima na kanseri.
              Amasomo ni magufi, afite amajwi n'amashusho, kandi akora no mu gihe nta internet.
            </p>
            <div className="row">
              <button className="btn btn-primary" onClick={onStart}>{returning ? 'Komeza kwiga' : 'Tangira kwiga'}</button>
              <button className="btn btn-secondary" onClick={onAdmin}>Injira muri konti</button>
            </div>
            <p className="muted small" style={{ marginTop: 12 }}>Ni ubuntu. Ushobora gukoresha Baho nta konti.</p>
          </div>
          <figure>
            <img src="/images/bp-check.svg" alt="Umuntu apimwa umuvuduko w'amaraso" />
            <figcaption>Isomo: Gupima umuvuduko w'amaraso</figcaption>
          </figure>
        </div>
      </section>

      <section className="landing-section">
        <div className="container stack">
          <h2>Ibyo Baho igufasha</h2>
          <div className="grid-3">
            <article className="service-item">
              <h3>Inzira y'imyigire yawe</h3>
              <p>Uhitamo indwara wifuza kumenyaho, Baho ikaguha urutonde rw'amasomo akurikirana.</p>
            </article>
            <article className="service-item">
              <h3>Amasomo y'amajwi</h3>
              <p>Buri somo rifite ishusho, inyandiko ngufi n'ijwi, n'isuzuma rito ryo kureba ko wumvise.</p>
            </article>
            <article className="service-item">
              <h3>Amakuru yizewe</h3>
              <p>Amasomo yandikwa n'abakozi b'ubuzima, agasuzumwa n'inzobere mbere yo gusohoka.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="landing-section" style={{ paddingTop: 0 }}>
        <div className="container grid-2">
          <div className="panel">
            <div className="panel-head"><h2>Uko bikora</h2></div>
            <div className="panel-body">
              <ol className="steps">
                <li>Hitamo ingingo zigushishikaje, wandike izina ryawe.</li>
                <li>Uzuza umwirondoro w'ubuzima (si ngombwa). Ibisubizo biguma kuri telefoni yawe.</li>
                <li>Kurikira inzira yawe: umva isomo, ukore isuzuma rito, urebe aho ugeze.</li>
              </ol>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><h2>Ku bakozi b'ubuzima</h2></div>
            <div className="panel-body">
              <p>Abanditsi bategura amasomo, inzobere zikemeza ibikubiye mu masomo y'indwara zabo, umuyobozi agasohora.</p>
              <button className="btn btn-secondary" onClick={onAdmin}>Injira nk'umukozi</button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
