import { useState } from "react";

// Mobile drawer's link list — the exact same destinations .nav-right
// renders, just stacked instead of horizontal, so there's only one place
// that decides which links exist and what they do.
function NavLinks({ currentUser, onSignOut, onNavigate, currentRoute, linkClassName, onLinkClick }) {
  const go = (page) => { onNavigate(page); onLinkClick?.(); };
  return (
    <>
      {!currentUser && (
        <button className={linkClassName === "nav-link" ? "btn btn-primary btn-sm" : linkClassName} onClick={() => go("onboarding")}>Try it free</button>
      )}
      <button className={`${linkClassName}${currentRoute === "how-it-works" ? " active" : ""}`} onClick={() => go("how-it-works")}>How it works</button>
      <button className={linkClassName} onClick={() => go("pricing")}>Pricing</button>
      <button className={`${linkClassName}${currentRoute === "story" ? " active" : ""}`} onClick={() => go("story")}>Why <em>And Then</em></button>
      {currentUser ? (
        <>
          <button className={linkClassName} onClick={() => go("dashboard")}>Dashboard</button>
          <button className={linkClassName} onClick={() => { onSignOut(); onLinkClick?.(); }}>Sign out</button>
        </>
      ) : (
        <button className={linkClassName} onClick={() => go("login")}>Sign in</button>
      )}
    </>
  );
}

export function Nav({ currentUser, onSignOut, onNavigate, currentRoute }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <nav className="nav">
        <span className="nav-logo" onClick={() => onNavigate("home")}>
          <em>And Then...</em>
        </span>
        <div className="nav-right">
          <NavLinks currentUser={currentUser} onSignOut={onSignOut} onNavigate={onNavigate} currentRoute={currentRoute} linkClassName="nav-link" />
        </div>

        <button type="button" className="nav-hamburger" aria-label="Open menu" onClick={() => setDrawerOpen(true)}>
          <span></span><span></span><span></span>
        </button>
      </nav>

      {/* Rendered as siblings of <nav>, not nested inside it — .nav has
          backdrop-filter, which (like filter) creates a new containing
          block for position: fixed descendants, so a fixed drawer/overlay
          nested inside it gets boxed into .nav's own height instead of the
          viewport. Same class of bug as the CropAdjuster/share-modal
          overlays elsewhere in this app, same fix. */}
      <div className={`nav-drawer-overlay${drawerOpen ? " open" : ""}`} onClick={() => setDrawerOpen(false)} />
      <div className={`nav-drawer${drawerOpen ? " open" : ""}`}>
        <button type="button" className="nav-drawer-close" aria-label="Close menu" onClick={() => setDrawerOpen(false)}>&times;</button>
        <NavLinks
          currentUser={currentUser}
          onSignOut={onSignOut}
          onNavigate={onNavigate}
          currentRoute={currentRoute}
          linkClassName="nav-drawer-link"
          onLinkClick={() => setDrawerOpen(false)}
        />
      </div>
    </>
  );
}
