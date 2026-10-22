import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { endpoints } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import Shell from '../components/Shell.jsx';
import DayGroups from '../components/DayGroups.jsx';
import { useToast } from '../components/Toast.jsx';
import { fieldError, handleApiError } from '../lib/errors.js';
import { minutesBetween, nextHour, startTime, toLocalInput } from '../lib/format.js';

const DURATIONS = [15, 30, 45, 60];

export default function ClinicPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [start, setStart] = useState(() => toLocalInput(nextHour()));
  const [duration, setDuration] = useState(30);

  const slotsQ = useQuery({
    queryKey: ['slots', 'mine', user.id],
    queryFn: () => endpoints.slots({ clinicId: user.id, availableOnly: 'false', limit: 100 }),
    refetchInterval: 15_000,
  });

  const create = useMutation({
    mutationFn: endpoints.createSlot,
    onSuccess: () => {
      toast.success('Time published.');
      // move the form to the end of the slot just created, ready for the next one
      setStart(toLocalInput(new Date(new Date(start).getTime() + duration * 60_000)));
      queryClient.invalidateQueries({ queryKey: ['slots'] });
    },
    onError: (err) => err.status === 429 && handleApiError(err, toast, queryClient),
  });

  const cancel = useMutation({
    mutationFn: endpoints.cancelSlot,
    onSuccess: () => {
      toast.success('Time cancelled.');
      queryClient.invalidateQueries({ queryKey: ['slots'] });
    },
    onError: (err) => handleApiError(err, toast, queryClient),
  });

  function submit(e) {
    e.preventDefault();
    const startsAt = new Date(start);
    create.mutate({
      startsAt: startsAt.toISOString(),
      endsAt: new Date(startsAt.getTime() + duration * 60_000).toISOString(),
    });
  }

  const err = create.error && create.error.status !== 429 ? create.error : null;
  const startErr = fieldError(err, 'startsAt');
  const endErr = fieldError(err, 'endsAt');
  const generalErr = err && !startErr && !endErr ? err.message : null;

  const slots = slotsQ.data ?? [];

  return (
    <Shell title="Your calendar">
      <div className="split split-clinic">
        <form className="card" onSubmit={submit} noValidate>
          <h2 id="new-title">Publish a time</h2>

          <div className="field">
            <label htmlFor="start">Starts</label>
            <input
              id="start"
              type="datetime-local"
              value={start}
              min={toLocalInput(new Date())}
              onChange={(e) => setStart(e.target.value)}
              aria-invalid={Boolean(startErr)}
              required
            />
            {startErr && <p className="field-error">{startErr}</p>}
          </div>

          <div className="field">
            <label htmlFor="duration">Length</label>
            <select id="duration" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {DURATIONS.map((m) => (
                <option key={m} value={m}>{m} minutes</option>
              ))}
            </select>
            {endErr && <p className="field-error">{endErr}</p>}
          </div>

          {generalErr && <p className="form-error" role="alert">{generalErr}</p>}

          <button className="btn btn-primary" disabled={create.isPending || !start}>
            {create.isPending ? 'Publishing…' : 'Publish time'}
          </button>
        </form>

        <section aria-labelledby="slots-title">
          <h2 id="slots-title">Your published times</h2>
          {slotsQ.isPending && <p className="muted">Loading…</p>}
          {slotsQ.isError && <p className="form-error" role="alert">{slotsQ.error.message}</p>}
          {slotsQ.isSuccess && slots.length === 0 && (
            <p className="empty">You have not published any times yet. Use the form to add your first one.</p>
          )}

          <DayGroups
            items={slots}
            getDate={(s) => s.starts_at}
            row={(s) => (
              <li key={s.id} className={s.available ? 'row row-open' : 'row row-booked'}>
                <div className="row-time">{startTime(s.starts_at)}</div>
                <div className="row-main">
                  <strong>{s.available ? 'Open' : 'Booked'}</strong>
                  <span className="muted">{minutesBetween(s.starts_at, s.ends_at)} minutes</span>
                </div>
                <button
                  className="btn btn-danger"
                  disabled={cancel.isPending}
                  onClick={() =>
                    window.confirm(
                      s.available
                        ? 'Cancel this time?'
                        : 'This time is booked. Cancelling it also cancels the patient’s appointment. Continue?',
                    ) && cancel.mutate(s.id)
                  }
                >
                  Cancel
                </button>
              </li>
            )}
          />
        </section>
      </div>
    </Shell>
  );
}
