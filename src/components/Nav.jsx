export function Nav({ currentUser, onSignOut, onNavigate, currentRoute }) {
  return (
    <nav className="nav">
      <span className="nav-logo" onClick={() => onNavigate("home")}>
        And Then<em>...</em>
      </span>
      <div className="nav-right">
        <button className={`nav-link${currentRoute === "how-it-works" ? " active" : ""}`} onClick={() => onNavigate("how-it-works")}>How it works</button>
        <button className="nav-link" onClick={() => onNavigate("pricing")}>Pricing</button>
        <button className={`nav-link${currentRoute === "story" ? " active" : ""}`} onClick={() => onNavigate("story")}>Why And Then</button>
        {currentUser ? (
          <>
            <button className="nav-link" onClick={() => onNavigate("dashboard")}>Dashboard</button>
            <button className="nav-link" onClick={onSignOut}>Sign out</button>
          </>
        ) : (
          <>
            <button className="nav-link" onClick={() => onNavigate("login")}>Sign in</button>
            <button className="btn btn-primary btn-sm" onClick={() => onNavigate("onboarding")}>Start gathering their stories</button>
          </>
        )}
      </div>
    </nav>
  );
}
