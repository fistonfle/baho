import { useState } from 'react';

import { Panel, PageHeader } from '../ui';

/**
 * Amabwiriza yo gukoresha Baho n'uko tubungabunga amakuru.
 *
 * Buri nteruro iri hano igomba kuba ari ukuri ku byo sisitemu ikora koko.  The
 * page is deliberately a statement of what the running system does, not a
 * template: every claim here is one the code can be held to, and the button at
 * the bottom is the mechanism rather than a promise.
 */
export function PrivacyScreen({
  isSignedIn,
  onHome,
  onAskQuestion,
  onDeleteLocalData
}: {
  isSignedIn: boolean;
  onHome: () => void;
  onAskQuestion: () => void;
  onDeleteLocalData: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  const remove = async () => {
    await onDeleteLocalData();
    setConfirming(false);
    setDone(true);
  };

  return (
    <div className="container">
      <PageHeader
        crumbs={[{ label: 'Ahabanza', onClick: onHome }, { label: "Amabwiriza n'ibanga ryawe" }]}
        title="Amabwiriza yo gukoresha Baho n'uko tubungabunga amakuru yawe"
        lead="Iki ni cyo Baho ikora n'amakuru yawe. Nta kindi."
      />

      <Panel title="1. Baho ni iki, kandi si iki">
        <p>
          Baho ni urubuga rw'inyigisho ku ndwara zitandura: umuvuduko w'amaraso ukabije, diyabete,
          indwara z'umutima na kanseri. Igufasha kumenya uko wakwirinda no kubaho neza.
        </p>
        <p>
          <strong>Baho ntisuzuma uburwayi kandi ntitanga imiti.</strong> Ntabwo ivuga ko urwaye
          cyangwa ko udafite uburwayi. Niba ufite ikibazo cy'ubuzima, jya ku kigo nderabuzima.
          Buri somo rikubwira ibyo.
        </p>
      </Panel>

      <Panel title="2. Amakuru tubika kuri seriveri">
        <p>Iyo wiyandikishije, tubika ibi gusa:</p>
        <ul>
          <li>Izina wihaye.</li>
          <li>Nimero ya telefoni yawe, cyangwa imeyili ku bakozi.</li>
          <li>PIN yawe <strong>itabitswe uko iri</strong>: tubika ikimenyetso cyayo gusa, bidashobora gusubizwa inyuma.</li>
          <li>Amasomo wasomye n'aho ugeze muri gahunda yawe.</li>
          <li>Ibisubizo watanze mu bibazo by'amasomo.</li>
          <li>Ibyo wisabye kwibutswa.</li>
          <li>Ibibazo wabajije n'ibibazo bya tekiniki watanzeho raporo.</li>
        </ul>
        <p>
          Dukoresha ayo makuru kugira ngo tuguhitiremo amasomo akubereye kandi tukwereke aho
          ugeze. Ntabwo tuyagurisha. Ntabwo tuyaha undi muntu cyangwa ikindi kigo.
        </p>
      </Panel>

      <Panel title="3. Amakuru tutabika na rimwe">
        <p>
          <strong>Umwirondoro w'ubuzima ntiwigera uva kuri telefoni yawe.</strong> Indwara wavuze
          ko ufite n'ibisubizo ku mibereho yawe bibikwa kuri iyi telefoni gusa, bihishwe
          (AES-GCM), mu bubiko bwa mushakisha yawe.
        </p>
        <p>
          Seriveri ya Baho nta hantu ifite ho kubibika kandi nta nzira ifite yo kubyakira. Si
          isezerano: ni uko sisitemu yubatse. Ni yo mpamvu ushobora kwanga kuwuzuza ukaguma ufite
          gahunda y'imyigire.
        </p>
      </Panel>

      <Panel title="4. Aho amakuru abikwa">
        <p>
          Seriveri ya Baho iri mu Rwanda, muri data centre ya MTN binyuze kuri Strettch Cloud.
          Itegeko n° 058/2021 rirasaba ko amakuru bwite abikwa mu Rwanda, kandi ni ko bimeze.
        </p>
      </Panel>

      <Panel title="5. Umutekano">
        <ul>
          <li>Ibyo wohereza byose binyura muri HTTPS, bihishwe mu nzira.</li>
          <li>PIN n'amagambo y'ibanga bibikwa mu buryo bw'ikimenyetso gihishe (scrypt), hamwe n'umunyu utandukanye kuri buri muntu.</li>
          <li>Iyo wibeshye inshuro nyinshi, konti ihagarikwa by'agateganyo.</li>
        </ul>
        <p>
          Icyo tudashobora kugukingira: umuntu wese ufunguye telefoni yawe ashobora gufungura
          Baho. Niba telefoni muyisangira, zirikana ibyo.
        </p>
      </Panel>

      <Panel title="6. Uburenganzira bwawe">
        <p>Ufite uburenganzira bwo:</p>
        <ul>
          <li>Kureba amakuru dufite kuri wowe.</li>
          <li>Kuyakosora iyo atari yo.</li>
          <li>Gusaba ko ahanagurwa.</li>
        </ul>
        <p>
          Amakuru abitswe kuri telefoni yawe, ushobora kuyahanagura ubwawe ubu nyine, hepfo aha.
          Ayabitswe kuri seriveri, bisaba ko utubaza: koresha{' '}
          <button type="button" className="btn btn-link" onClick={onAskQuestion}>
            Ubufasha &rarr; Baza ikibazo
          </button>
          . Tuzagusubiza.
        </p>
        <p>
          Tubika amakuru ya konti yawe igihe cyose konti ikiriho. Nta gihe ntarengwa cyashyizweho
          ubu; tugitegura.
        </p>
      </Panel>

      <Panel title="7. Amafoto n'inyandiko">
        <p>
          Amafoto y'amasomo aturuka kuri Wikimedia Commons kandi afite uburenganzira bwo
          gukoreshwa (Creative Commons cyangwa public domain). Amazina y'abayafashe n'uburenganzira
          bwayo biri muri <strong>Ubufasha &rarr; Inkomoko y'amafoto</strong>. Inyandiko z'amasomo
          zanditswe kuri uyu mushinga.
        </p>
      </Panel>

      <Panel title="8. Guhanagura amakuru abitswe kuri iyi telefoni">
        <p>
          Iyi buto ihanagura umwirondoro w'ubuzima wawe, ibisubizo by'isuzuma, n'amasomo
          yabitswe kuri iyi telefoni. Ntibisubirwaho.
        </p>
        {done ? (
          <p role="status" className="alert alert-success">
            Byahanaguwe. Amakuru yari abitswe kuri iyi telefoni ntakiriho.
          </p>
        ) : confirming ? (
          <div className="form-actions">
            <button type="button" className="btn btn-danger" onClick={() => void remove()}>
              Yego, bihanagure
            </button>
            <button type="button" className="btn" onClick={() => setConfirming(false)}>
              Oya, reka
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-danger" onClick={() => setConfirming(true)}>
            Hanagura amakuru yo kuri iyi telefoni
          </button>
        )}
        {isSignedIn && (
          <p className="muted">
            Ibi ntibihanagura konti yawe kuri seriveri. Kugira ngo iyo ihanagurwe, tubaze mu
            Bufasha.
          </p>
        )}
      </Panel>

      <Panel title="9. Impinduka">
        <p>
          Nihagira ikintu gihinduka kuri aya mabwiriza, tuzabishyira kuri uru rupapuro. Iyi
          verisiyo ni iyo muri Ugushyingo 2026.
        </p>
      </Panel>
    </div>
  );
}
