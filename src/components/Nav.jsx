export function Nav({ currentUser, onSignOut, onNavigate }) {
  return (
    <nav className="nav">
      <span className="nav-logo" onClick={() => onNavigate("home")}>
        And Then<em>...</em>
      </span>
      <div className="nav-right">
        {currentUser ? (
          <>
            <button className="nav-link" onClick={() => onNavigate("dashboard")}>Dashboard</button>
            <button className="nav-link" onClick={onSignOut}>Sign out</button>
          </>
        ) : (
          <>
            <button className="nav-link" onClick={() => onNavigate("login")}>Sign in</button>
            <button className="btn btn-primary btn-sm" onClick={() => onNavigate("login")}>Start gathering their stories</button>
          </>
        )}
      </div>
    </nav>
  );
}
