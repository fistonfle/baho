// Admin: find learners and reset their PIN.
import { useEffect, useState } from 'react';

import { api, type Learner } from '../../services/api';
import { setFeedbackMessage } from '../../store/appSlice';
import { useAppDispatch } from '../../store/hooks';
import { Empty, Panel } from '../ui';

const formatPhone = (phone: string) => {
  const digits = String(phone || '').replace(/^\+250/, '0');
  return digits.length === 10 ? `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}` : phone;
};

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

export function LearnerPanel() {
  const dispatch = useAppDispatch();
  const notify = (message: string) => dispatch(setFeedbackMessage(message));
  const [search, setSearch] = useState('');
  const [learners, setLearners] = useState<Learner[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [issued, setIssued] = useState<{ id: number; pin: string } | null>(null);

  const load = async (term = '') => {
    setLoading(true);
    try {
      const response = await api.getLearners(term);
      setLearners(response.learners);
    } catch {
      notify('Could not load learner accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const resetPin = async (learner: Learner) => {
    const confirmed = window.confirm(
      `Give ${learner.fullName} (${formatPhone(learner.phone)}) a new PIN? The old one stops working immediately.`
    );
    if (!confirmed) return;
    setBusyId(learner.id);
    setIssued(null);
    try {
      const response = await api.resetLearnerPin(learner.id);
      setIssued({ id: learner.id, pin: response.pin });
      notify('The PIN has been changed.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not change the PIN.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Panel
      title="Learners"
      description="Learners sign in with a phone number and a PIN. If a learner forgets the PIN, check who they are and give them a new one."
    >
      <form
        className="row"
        onSubmit={(event) => { event.preventDefault(); void load(search.trim()); }}
      >
        <label className="visually-hidden" htmlFor="learner-search">Search by name or phone number</label>
        <input
          id="learner-search"
          className="input"
          style={{ maxWidth: '22rem' }}
          type="search"
          placeholder="Name or phone number"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button className="btn" type="submit">Search</button>
        {search && (
          <button className="btn" type="button" onClick={() => { setSearch(''); void load(); }}>Clear</button>
        )}
      </form>

      {issued && (
        <p className="alert alert-success">
          New PIN: <strong>{issued.pin}</strong>. Read it to the learner now and ask them to change it after signing in.
          It is not shown again.
        </p>
      )}

      {loading ? (
        <Empty>Loading learner accounts...</Empty>
      ) : learners.length === 0 ? (
        <Empty>{search ? 'No learner matches that name or number.' : 'No learner has created an account yet.'}</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone number</th>
                <th>Joined</th>
                <th>PIN</th>
              </tr>
            </thead>
            <tbody>
              {learners.map((learner) => (
                <tr key={learner.id}>
                  <td>{learner.fullName}</td>
                  <td>{formatPhone(learner.phone)}</td>
                  <td>{formatDate(learner.createdAt)}</td>
                  <td>
                    <button
                      className="btn btn-sm"
                      type="button"
                      disabled={busyId === learner.id}
                      onClick={() => void resetPin(learner)}
                    >
                      {busyId === learner.id ? 'Changing...' : 'Give a new PIN'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
