import type { Reminder } from '../../types';
import { Empty, PageHeader } from '../ui';

const presets = [
  { label: 'Kunywa amazi', time: '10:00' },
  { label: 'Kugenda iminota 30', time: '17:00' },
  { label: 'Gufata imiti', time: '08:00' },
  { label: 'Kwipimisha ku kigo nderabuzima', time: '09:00' },
  { label: 'Kumva isomo rya Baho', time: '20:00' }
];

export function RemindersScreen({
  reminders,
  form,
  notificationsAllowed,
  isSignedIn,
  onFormChange,
  onAdd,
  onDelete,
  onEnableNotifications,
  onHome
}: {
  reminders: Reminder[];
  form: { time: string; label: string };
  notificationsAllowed: boolean;
  isSignedIn: boolean;
  onFormChange: (changes: Partial<{ time: string; label: string }>) => void;
  onAdd: () => void;
  onDelete: (id: number) => void;
  onEnableNotifications: () => void;
  onHome: () => void;
}) {
  const sorted = [...reminders].sort((a, b) => a.time.localeCompare(b.time));
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const nextReminder = sorted.find((item) => item.time > currentTime) ?? sorted[0];

  return (
    <div className="container">
      <PageHeader
        crumbs={[{ label: 'Ahabanza', onClick: onHome }, { label: 'Ibyibutsa' }]}
        title="Ibyibutsa"
        lead={<>{isSignedIn ? 'Bibitswe kuri konti yawe.' : 'Bibitswe kuri iyi telefoni.'} {nextReminder && <>Igikurikira: <strong>{nextReminder.time}</strong>, {nextReminder.label}.</>}</>}
      />
      {!notificationsAllowed && 'Notification' in window && (
        <div className="alert alert-info row-between" style={{ marginBottom: 20 }}>
          <span>Emerera Baho kukohereza ubutumwa igihe cyo kwibutswa kigeze.</span>
          <button className="btn btn-secondary btn-sm" onClick={onEnableNotifications}>Emera ubutumwa</button>
        </div>
      )}
      <div className="layout-main-aside">
        <section className="panel">
          <div className="panel-head"><h2>Urutonde rw'ibyibutsa</h2></div>
          <div className="panel-body flush">
            {sorted.length === 0 ? <Empty>Nta byibutsa urashyiraho.</Empty> : (
              <table className="table">
                <thead><tr><th>Isaha</th><th>Icyo kwibutswa</th><th className="right">Igikorwa</th></tr></thead>
                <tbody>
                  {sorted.map((item) => (
                    <tr key={item.id}>
                      <td style={{ width: 90 }}><strong>{item.time}</strong></td>
                      <td>{item.label}</td>
                      <td className="right"><button className="btn btn-danger btn-sm" onClick={() => onDelete(item.id)} aria-label={`Siba ${item.label}`}>Siba</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="panel-foot small muted">Ubutumwa bwo kwibutsa bugaragara igihe Baho ifunguye. Nta internet, ibyibutsa biguma bigaragara hano.</div>
        </section>

        <form className="panel" onSubmit={(event) => { event.preventDefault(); onAdd(); }}>
          <div className="panel-head"><h2>Ongeraho icyibutsa</h2></div>
          <div className="panel-body">
            <div className="form-group">
              <label htmlFor="reminder-preset">Icyitegererezo</label>
              <select
                id="reminder-preset"
                className="input"
                value=""
                onChange={(event) => {
                  const preset = presets.find((item) => item.label === event.target.value);
                  if (preset) onFormChange({ label: preset.label, time: preset.time });
                }}
              >
                <option value="">Hitamo icyitegererezo (si ngombwa)</option>
                {presets.map((preset) => <option key={preset.label} value={preset.label}>{preset.label} ({preset.time})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="reminder-time">Isaha</label>
              <input id="reminder-time" className="input" type="time" value={form.time} onChange={(event) => onFormChange({ time: event.target.value })} required />
            </div>
            <div className="form-group">
              <label htmlFor="reminder-label">Icyo kwibutswa</label>
              <input id="reminder-label" className="input" type="text" placeholder="Urugero: Kunywa amazi" value={form.label} onChange={(event) => onFormChange({ label: event.target.value })} required />
            </div>
            <button className="btn btn-primary" type="submit">Ongeraho</button>
          </div>
        </form>
      </div>
    </div>
  );
}
