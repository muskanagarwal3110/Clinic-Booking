import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { endpoints } from '../api/client.js';
import Shell from '../components/Shell.jsx';
import DayGroups from '../components/DayGroups.jsx';
import { useToast } from '../components/Toast.jsx';
import { handleApiError } from '../lib/errors.js';
import { minutesBetween, shortDate, startTime, timeRange } from '../lib/format.js';

export default function PatientPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [clinicId, setClinicId] = useState('all');

  // polled so slots taken by other patients disappear without a manual refresh
  const slotsQ = useQuery({
    queryKey: ['slots', 'open'],
    queryFn: () => endpoints.slots({ limit: 100 }),
    refetchInterval: 15_000,
  });
  const bookingsQ = useQuery({ queryKey: ['bookings'], queryFn: endpoints.myBookings });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['slots'] });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
  };

  const book = useMutation({
    mutationFn: endpoints.book,
    onSuccess: () => {
      toast.success('Appointment booked.');
      refresh();
    },
    onError: (err) => handleApiError(err, toast, queryClient),
  });

  const cancel = useMutation({
    mutationFn: endpoints.cancelBooking,
    onSuccess: () => {
      toast.success('Appointment cancelled. The time is open again.');
      refresh();
    },
    onError: (err) => handleApiError(err, toast, queryClient),
  });

  const slots = slotsQ.data ?? [];
  const clinics = [...new Map(slots.map((s) => [s.clinic_id, s.clinic_name])).entries()];
  const visible = clinicId === 'all' ? slots : slots.filter((s) => String(s.clinic_id) === clinicId);

  const bookings = bookingsQ.data ?? [];
  const now = new Date();
  const upcoming = bookings.filter((b) => b.status === 'confirmed' && new Date(b.starts_at) > now);
  const history = bookings.filter((b) => !upcoming.includes(b));

  return (
    <Shell title="Find a time">
      <div className="split">
        <section aria-labelledby="open-title">
          <div className="section-head">
            <h2 id="open-title">Open appointments</h2>
            <label className="inline">
              <span className="sr-only">Filter by clinic</span>
              <select value={clinicId} onChange={(e) => setClinicId(e.target.value)}>
                <option value="all">All clinics</option>
                {clinics.map(([id, name]) => (
                  <option key={id} value={String(id)}>{name}</option>
                ))}
              </select>
            </label>
          </div>

          {slotsQ.isPending && <p className="muted">Loading appointments…</p>}
          {slotsQ.isError && (
            <p className="form-error" role="alert">
              {slotsQ.error.message}{' '}
              <button className="link" onClick={() => slotsQ.refetch()}>Try again</button>
            </p>
          )}
          {slotsQ.isSuccess && visible.length === 0 && (
            <p className="empty">No open appointments right now. New times appear here as clinics publish them.</p>
          )}

          <DayGroups
            items={visible}
            getDate={(s) => s.starts_at}
            row={(s) => (
              <li key={s.id} className="row row-open">
                <div className="row-time">{startTime(s.starts_at)}</div>
                <div className="row-main">
                  <strong>{s.clinic_name}</strong>
                  <span className="muted">{minutesBetween(s.starts_at, s.ends_at)} minutes</span>
                </div>
                <button
                  className="btn btn-primary"
                  disabled={book.isPending}
                  onClick={() => book.mutate(s.id)}
                >
                  {book.isPending && book.variables === s.id ? 'Booking…' : 'Book'}
                </button>
              </li>
            )}
          />
        </section>

        <aside aria-labelledby="mine-title">
          <h2 id="mine-title">Your appointments</h2>
          {bookingsQ.isPending && <p className="muted">Loading…</p>}
          {bookingsQ.isSuccess && upcoming.length === 0 && (
            <p className="empty">Nothing booked yet. Pick a time from the list.</p>
          )}
          <ul className="rows">
            {upcoming.map((b) => (
              <li key={b.id} className="row row-booked">
                <div className="row-main">
                  <strong>{b.clinic_name}</strong>
                  <span>{shortDate(b.starts_at)}, {timeRange(b.starts_at, b.ends_at)}</span>
                </div>
                <button
                  className="btn btn-danger"
                  disabled={cancel.isPending}
                  onClick={() => window.confirm('Cancel this appointment?') && cancel.mutate(b.id)}
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>

          {history.length > 0 && (
            <details className="history">
              <summary>Past and cancelled ({history.length})</summary>
              <ul className="rows">
                {history.map((b) => (
                  <li key={b.id} className="row row-past">
                    <div className="row-main">
                      <strong>{b.clinic_name}</strong>
                      <span>{shortDate(b.starts_at)}, {startTime(b.starts_at)}</span>
                    </div>
                    <span className="badge">{b.status === 'cancelled' ? 'Cancelled' : 'Completed'}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </aside>
      </div>
    </Shell>
  );
}
