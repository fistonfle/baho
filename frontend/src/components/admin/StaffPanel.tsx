// Staff accounts and specialist topic assignment (admins only).
import { useState } from 'react';

import { api } from '../../services/api';
import {
  addCreatorLocal,
  setAdminCreators,
  setFeedbackMessage,
  updateCreatorForm,
  type StaffMember
} from '../../store/appSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { Empty, Panel, StatusBadge } from '../ui';
import { roleNames } from './shared';

export function StaffPanel() {
  const dispatch = useAppDispatch();
  const staff = useAppSelector((state) => state.app.adminCreators);
  const creatorForm = useAppSelector((state) => state.app.creatorForm);
  const categories = useAppSelector((state) => state.app.categories);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTopics, setEditTopics] = useState<number[]>([]);
  const notify = (message: string) => dispatch(setFeedbackMessage(message));
  const topicNames = (ids: number[]) => ids.map((id) => categories.find((category) => category.id === id)?.name).filter(Boolean).join(', ');
  const toggle = (ids: number[], id: number) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);

  const createStaff = async () => {
    if (!creatorForm.fullName.trim() || !creatorForm.email.trim() || creatorForm.password.length < 8) {
      notify('Enter a full name, an email and a password of at least 8 characters.');
      return;
    }
    if (creatorForm.role === 'specialist' && creatorForm.topicIds.length === 0) {
      notify('Choose at least one disease for the specialist to review.');
      return;
    }
    try {
      const response = await api.createCreator({
        fullName: creatorForm.fullName.trim(),
        email: creatorForm.email.trim(),
        password: creatorForm.password,
        role: creatorForm.role,
        topicIds: creatorForm.role === 'specialist' ? creatorForm.topicIds : []
      });
      dispatch(addCreatorLocal(response.user));
      notify(`Account created for the new ${roleNames[creatorForm.role].toLowerCase()}.`);
    } catch {
      notify('Could not create the account. The email may already be in use.');
    }
  };

  const saveTopics = async (member: StaffMember) => {
    if (editTopics.length === 0) {
      notify('A specialist needs at least one disease.');
      return;
    }
    try {
      const response = await api.updateSpecialistTopics(member.id, editTopics);
      dispatch(setAdminCreators(staff.map((item) => (item.id === member.id ? { ...item, topicIds: response.categoryIds } : item))));
      setEditingId(null);
      notify('Specialist diseases updated.');
    } catch {
      notify('Could not save.');
    }
  };

  return (
    <div className="layout-main-aside">
      <Panel title="Baho staff" description="Writers draft lessons, specialists approve lessons on their diseases, admins publish." flush>
        {staff.length === 0 ? <Empty>No staff accounts yet.</Empty> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Name</th><th>Role</th><th>Reviews</th><th className="right">Actions</th></tr></thead>
              <tbody>
                {staff.map((member) => (
                  <tr key={member.id}>
                    <td><strong>{member.fullName}</strong><div className="small muted">{member.email}</div></td>
                    <td><StatusBadge label={roleNames[member.role] ?? member.role} tone={member.role === 'admin' ? 'success' : member.role === 'specialist' ? 'info' : 'neutral'} /></td>
                    <td>
                      {member.role !== 'specialist' ? <span className="muted">–</span> : editingId === member.id ? (
                        <div className="stack-sm">
                          <div className="checkbox-row">
                            {categories.map((category) => (
                              <label key={category.id} className="check">
                                <input type="checkbox" checked={editTopics.includes(category.id)} onChange={() => setEditTopics(toggle(editTopics, category.id))} />
                                {category.name}
                              </label>
                            ))}
                          </div>
                          <div className="row">
                            <button className="btn btn-primary btn-sm" onClick={() => void saveTopics(member)}>Save</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : topicNames(member.topicIds ?? [])}
                    </td>
                    <td className="right">
                      {member.role === 'specialist' && editingId !== member.id && (
                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditingId(member.id); setEditTopics(member.topicIds ?? []); }}>Change diseases</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <form className="panel" onSubmit={(event) => { event.preventDefault(); void createStaff(); }}>
        <div className="panel-head"><h2>Add staff member</h2></div>
        <div className="panel-body">
          <div className="form-group">
            <label htmlFor="staff-name">Full name</label>
            <input id="staff-name" className="input" value={creatorForm.fullName} onChange={(event) => dispatch(updateCreatorForm({ fullName: event.target.value }))} required />
          </div>
          <div className="form-group">
            <label htmlFor="staff-email">Email</label>
            <input id="staff-email" className="input" type="email" value={creatorForm.email} onChange={(event) => dispatch(updateCreatorForm({ email: event.target.value }))} required />
          </div>
          <div className="form-group">
            <label htmlFor="staff-password">Temporary password</label>
            <input id="staff-password" className="input" type="password" minLength={8} value={creatorForm.password} onChange={(event) => dispatch(updateCreatorForm({ password: event.target.value }))} required />
          </div>
          <div className="form-group">
            <label htmlFor="staff-role">Role</label>
            <select id="staff-role" className="input" value={creatorForm.role} onChange={(event) => dispatch(updateCreatorForm({ role: event.target.value }))}>
              <option value="creator">Writer: drafts lessons</option>
              <option value="specialist">Specialist: approves lessons on their diseases</option>
              <option value="admin">Admin: manages everything</option>
            </select>
          </div>
          {creatorForm.role === 'specialist' && (
            <fieldset className="form-group" style={{ border: 0, padding: 0 }}>
              <legend className="form-label">Diseases this specialist reviews</legend>
              <div className="stack-sm">
                {categories.map((category) => (
                  <label key={category.id} className="check">
                    <input type="checkbox" checked={creatorForm.topicIds.includes(category.id)} onChange={() => dispatch(updateCreatorForm({ topicIds: toggle(creatorForm.topicIds, category.id) }))} />
                    {category.name}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <button className="btn btn-primary" type="submit">Create account</button>
        </div>
      </form>
    </div>
  );
}
