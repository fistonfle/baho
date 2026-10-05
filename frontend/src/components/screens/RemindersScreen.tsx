import type { Reminder } from '../../types';

const presets = [
  { icon: '💧', label: 'Kunywa amazi', time: '10:00' },
  { icon: '🚶', label: 'Kugenda iminota 30', time: '17:00' },
  { icon: '💊', label: 'Gufata imiti', time: '08:00' },
  { icon: '🩺', label: 'Kwipimisha ku kigo nderabuzima', time: '09:00' },
  { icon: '🎧', label: 'Kumva isomo rya Baho', time: '20:00' }
];

export function RemindersScreen({
  reminders,
  form,
  notificationsAllowed,
  isSignedIn,
  onFormChange,
  onAdd,
  onDelete,
  onEnableNotifications
}: {
  reminders: Reminder[];
  form: { time: string; label: string };
  notificationsAllowed: boolean;
  isSignedIn: boolean;
  onFormChange: (changes: Partial<{ time: string; label: string }>) => void;
  onAdd: () => void;
  onDelete: (id: number) => void;
  onEnableNotifications: () => void;
}) {
  const sorted = [...reminders].sort((a, b) => a.time.localeCompare(b.time));
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const nextReminder = sorted.find((item) => item.time > currentTime) ?? sorted[0];

  return (
    <div className="screen dynamic-screen reminders-screen">
      <div className="panel-section">
        <p className="eyebrow">Ibyibutsa</p>
        <h2>Ibyibutsa byawe</h2>
        <p className="screen-intro">{isSignedIn ? 'Bibitswe kuri konti yawe.' : 'Bibitswe kuri iyi telefoni.'} {nextReminder && <>Igikurikira: <strong>{nextReminder.time}</strong> · {nextReminder.label}</>}</p>

        {!notificationsAllowed && 'Notification' in window && (
          <div className="notify-banner">
            <span aria-hidden="true">🔔</span>
            <p>Emerera Baho kukohereza ubutumwa igihe cyo kwibutswa kigeze.</p>
            <button className="secondary" onClick={onEnableNotifications}>Emera</button>
          </div>
        )}

        <h3 className="subheading">Ongeraho vuba</h3>
        <div className="preset-row">
          {presets.map((preset) => (
            <button key={preset.label} className="preset-chip" onClick={() => onFormChange({ label: preset.label, time: preset.time })}>
              <span aria-hidden="true">{preset.icon}</span> {preset.label}
            </button>
          ))}
        </div>

        <form className="reminder-form" onSubmit={(event) => { event.preventDefault(); onAdd(); }}>
          <label className="creator-field">
            <span>Isaha</span>
            <input type="time" value={form.time} onChange={(event) => onFormChange({ time: event.target.value })} required />
          </label>
          <label className="creator-field">
            <span>Icyo kwibutswa</span>
            <input type="text" placeholder="Urugero: Kunywa amazi" value={form.label} onChange={(event) => onFormChange({ label: event.target.value })} required />
          </label>
          <button className="primary" type="submit">+ Ongeraho</button>
        </form>

        <div className="reminder-list">
          {sorted.length === 0 && (
            <div className="creator-empty-state">
              <span aria-hidden="true">🔔</span>
              <strong>Nta byibutsa urashyiraho</strong>
              <p>Hitamo kimwe mu byavuzwe haruguru cyangwa wandike icyawe.</p>
            </div>
          )}
          {sorted.map((item) => (
            <div key={item.id} className="reminder-row">
              <div>
                <span className="reminder-time">{item.time}</span>
                <strong>{item.label}</strong>
              </div>
              <button className="small-button" onClick={() => onDelete(item.id)} aria-label={`Siba ${item.label}`}>Siba</button>
            </div>
          ))}
        </div>
        <p className="reminder-note">Ubutumwa bwo kwibutsa bugaragara igihe Baho ifunguye. Iyo telefoni idafite internet, ibyibutsa biguma bigaragara hano.</p>
      </div>
    </div>
  );
}
