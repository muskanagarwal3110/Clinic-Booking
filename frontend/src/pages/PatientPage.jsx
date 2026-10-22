import { useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { endpoints } from "../api/client.js";
import Shell from "../components/Shell.jsx";
import DayGroups from "../components/DayGroups.jsx";
import { useToast } from "../components/Toast.jsx";
import { handleApiError } from "../lib/errors.js";
import {
  minutesBetween,
  shortDate,
  startTime,
  timeRange,
} from "../lib/format.js";

export default function PatientPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [clinicId, setClinicId] = useState("all");

  // every clinic, even those with no slots, so the filter lists them all
  const clinicsQ = useQuery({
    queryKey: ["clinics"],
    queryFn: endpoints.clinics,
    staleTime: 60_000,
  });

  // ONE request returns open and booked slots (each has an `available` flag), so both lists
  // always come from the same snapshot. Filtering by clinic happens on the server, so a
  // clinic with no slots simply returns an empty list.
  const slotsQ = useQuery({
    queryKey: ["slots", "board", clinicId],
    queryFn: () =>
      endpoints.slots({
        limit: 100,
        availableOnly: "false",
        clinicId: clinicId === "all" ? undefined : clinicId,
      }),
    placeholderData: keepPreviousData,
    refetchInterval: 15_000, // picks up slots other patients book or cancel
  });

  const bookingsQ = useQuery({
    queryKey: ["bookings"],
    queryFn: endpoints.myBookings,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["slots"] });
    queryClient.invalidateQueries({ queryKey: ["bookings"] });
  };

  // patch the cached list so a slot jumps between the two lists without waiting for the network
  const setAvailable = (slotId, available) =>
    queryClient.setQueriesData({ queryKey: ["slots", "board"] }, (old) =>
      old?.map((s) => (s.id === slotId ? { ...s, available } : s)),
    );

  const book = useMutation({
    mutationFn: endpoints.book,
    onSuccess: (_booking, slotId) => {
      toast.success("Appointment booked.");
      setAvailable(slotId, false); // moves to "Already booked" instantly; the refetch confirms it
      refresh();
    },
    onError: (err) => handleApiError(err, toast, queryClient),
  });

  const cancel = useMutation({
    mutationFn: endpoints.cancelBooking,
    onSuccess: (booking) => {
      toast.success("Appointment cancelled. The time is open again.");
      setAvailable(booking.slot_id, true);
      refresh();
    },
    onError: (err) => handleApiError(err, toast, queryClient),
  });

  const clinics = clinicsQ.data ?? [];
  const slots = slotsQ.data ?? [];
  const visible = slots.filter((s) => s.available); // open list
  const taken = slots.filter((s) => !s.available); // already-booked list
  const selectedClinic = clinics.find((c) => String(c.id) === clinicId);

  const bookings = bookingsQ.data ?? [];
  const now = new Date();
  const upcoming = bookings.filter(
    (b) => b.status === "confirmed" && new Date(b.starts_at) > now,
  );
  const history = bookings.filter((b) => !upcoming.includes(b));
  const mySlotIds = new Set(upcoming.map((b) => b.slot_id));

  return (
    <Shell title="Find a time">
      <div className="split">
        <section aria-labelledby="open-title">
          <div className="section-head">
            <h2 id="open-title">Open appointments</h2>
            <label className="inline">
              <span className="sr-only">Filter by clinic</span>
              <select
                value={clinicId}
                onChange={(e) => setClinicId(e.target.value)}
              >
                <option value="all">All clinics</option>
                {clinics.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {slotsQ.isPending && <p className="muted">Loading appointments…</p>}
          {slotsQ.isError && (
            <p className="form-error" role="alert">
              {slotsQ.error.message}{" "}
              <button className="link" onClick={() => slotsQ.refetch()}>
                Try again
              </button>
            </p>
          )}
          {slotsQ.isSuccess &&
            !slotsQ.isPlaceholderData &&
            visible.length === 0 &&
            (selectedClinic ? (
              <p className="empty">
                <strong>No current open appointments</strong> at{" "}
                {selectedClinic.name}. Check back later or choose another
                clinic.
              </p>
            ) : (
              <p className="empty">
                <strong>No current open appointments.</strong> New times appear
                here as clinics publish them.
              </p>
            ))}

          <DayGroups
            items={visible}
            getDate={(s) => s.starts_at}
            row={(s) => (
              <li key={s.id} className="row row-open">
                <div className="row-time">{startTime(s.starts_at)}</div>
                <div className="row-main">
                  <strong>{s.clinic_name}</strong>
                  <span className="muted">
                    {minutesBetween(s.starts_at, s.ends_at)} minutes
                  </span>
                </div>
                <button
                  className="btn btn-primary"
                  disabled={book.isPending}
                  onClick={() => book.mutate(s.id)}
                >
                  {book.isPending && book.variables === s.id
                    ? "Booking…"
                    : "Book"}
                </button>
              </li>
            )}
          />

          <div className="taken-section" role="region" aria-labelledby="taken-title">
            <h2 id="taken-title">Already booked</h2>

            {slotsQ.isSuccess &&
              !slotsQ.isPlaceholderData &&
              taken.length === 0 && (
                <p className="empty">No booked appointments yet.</p>
              )}

            <DayGroups
              items={taken}
              getDate={(s) => s.starts_at}
              row={(s) => (
                <li key={s.id} className="row row-taken">
                  <div className="row-time">{startTime(s.starts_at)}</div>
                  <div className="row-main">
                    <strong>{s.clinic_name}</strong>
                    <span className="muted">
                      {minutesBetween(s.starts_at, s.ends_at)} minutes
                    </span>
                  </div>
                  <span className="badge badge-taken">
                    {mySlotIds.has(s.id) ? "Booked by you" : "Booked"}
                  </span>
                </li>
              )}
            />
          </div>
        </section>

        <aside aria-labelledby="mine-title">
          <h2 id="mine-title">Your appointments</h2>
          {bookingsQ.isPending && <p className="muted">Loading…</p>}
          {bookingsQ.isSuccess && upcoming.length === 0 && (
            <p className="empty">
              Nothing booked yet. Pick a time from the list.
            </p>
          )}
          <ul className="rows">
            {upcoming.map((b) => (
              <li key={b.id} className="row row-booked">
                <div className="row-main">
                  <strong>{b.clinic_name}</strong>
                  <span>
                    {shortDate(b.starts_at)},{" "}
                    {timeRange(b.starts_at, b.ends_at)}
                  </span>
                </div>
                <button
                  className="btn btn-danger"
                  disabled={cancel.isPending}
                  onClick={() =>
                    window.confirm("Cancel this appointment?") &&
                    cancel.mutate(b.id)
                  }
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
                      <span>
                        {shortDate(b.starts_at)}, {startTime(b.starts_at)}
                      </span>
                    </div>
                    <span className="badge">
                      {b.status === "cancelled" ? "Cancelled" : "Completed"}
                    </span>
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