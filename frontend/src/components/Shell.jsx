import { useAuth } from '../auth/AuthContext.jsx';

export default function Shell({ title, children }) {
  const { user, logout } = useAuth();
  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">Clinic Booking</span>
        <div className="who">
          <span>
            {user.name} <span className="muted">({user.role})</span>
          </span>
          <button className="btn btn-quiet" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>
      <main className="page">
        <h1>{title}</h1>
        {children}
      </main>
    </div>
  );
}
