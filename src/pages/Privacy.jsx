// Legal page — static content, no data fetching. Not in the nav by design
// (per the request that added it); reachable only via the "Privacy" link
// already sitting, previously inert, in every marketing page's footer.
const VENDORS = [
  { name: "Supabase", handles: "Account authentication, database storage, and file storage for photos, videos, and voicemails" },
  { name: "Resend", handles: "Delivery of notification and moderation emails" },
  { name: "Vercel", handles: "Website hosting" },
  { name: "Stripe", handles: "Payment processing for page upgrades" },
  { name: "Google Analytics", handles: "Aggregate usage statistics" },
];

export function PrivacyPage({ onNavigate }) {
  return (
    <div className="mkt-page">
      <div className="page-wrap mkt-page-hero">
        <header>
          <div className="mkt-eyebrow fade-up"><span className="mkt-eyebrow-line" aria-hidden="true" />Privacy Policy</div>
          <h1 className="mkt-h1 fade-up-2">And Then — Privacy Policy</h1>
          <p className="mkt-page-hero-sub fade-up-3">
            Effective date: September 20, 2026. <em>And Then</em> is operated by AND THEN LLC, an Ohio limited liability company. If anything in this policy is unclear, email <a href="mailto:hello@myandthen.com">hello@myandthen.com</a>.
          </p>
        </header>

        <div className="mkt-legal fade-up-3">
          <section>
            <h2>Overview</h2>
            <p>This policy explains what information And Then collects, how it's used, and what you can do about it. It applies to everyone who uses myandthen.com: people who create a page, people who contribute a memory to one, and visitors who browse a page without contributing.</p>
          </section>

          <section>
            <h2>Information We Collect</h2>
            <p>We collect two different kinds of information, from two different kinds of people.</p>
            <p><strong>Account information</strong>, from anyone who creates a page: your email address, and payment information if you upgrade a page (handled directly by our payment processor, Stripe; we never see or store full card numbers).</p>
            <p><strong>Page content</strong>, from anyone who contributes a memory, whether or not they have an account: photos, videos, voicemails, written and spoken stories, recipes, and documents; the contributor's name and their relationship to the person the page honors; and, optionally, the contributor's email address if they want to be notified of replies.</p>
            <p>Most contributors never create an account. They receive a link, add a memory, and that's the entire relationship. We collect only what they submit through that link.</p>
          </section>

          <section>
            <h2>How We Use Information</h2>
            <p>We use account information to operate your page: authenticate you, send you notifications when someone adds a memory, process payment if you upgrade, and respond if you contact us.</p>
            <p>We use page content to display it on the page it was submitted to, exactly as that page's privacy setting allows (public, invite-only, or private with an access code). We use a contributor's email address only to send that contributor a confirmation or a reply notification, never for anything else.</p>
            <p>We do not use any of this information for advertising, and we do not build profiles of visitors across pages.</p>
          </section>

          <section>
            <h2>What We Never Do</h2>
            <ul>
              <li>We never sell your data, your memories, or anyone else's, to anyone, for any reason.</li>
              <li>We never license or share page content with data brokers, advertisers, or marketing partners.</li>
              <li>We never run ads on And Then, so we have no reason to share your data with an ad network.</li>
            </ul>
          </section>

          <section>
            <h2>Third-Party Service Providers</h2>
            <p>We rely on a small number of vendors to run And Then. Each processes data only to provide their specific service to us, under their own privacy and security terms.</p>
            <table className="mkt-legal-table">
              <thead>
                <tr><th>Vendor</th><th>What they handle</th></tr>
              </thead>
              <tbody>
                {VENDORS.map((v) => (
                  <tr key={v.name}><td>{v.name}</td><td>{v.handles}</td></tr>
                ))}
              </tbody>
            </table>
            <p>We don't add a new vendor with access to page content without updating this list.</p>
          </section>

          <section>
            <h2>Data About the Person Being Honored</h2>
            <p>Every page is about someone, and that someone is usually not the person managing the page or agreeing to this policy. In most cases, the subject of a page has died and cannot consent to what's shared about them. In every case, most of what's on the page (photos, stories, memories) is submitted by other people describing that person, not by the person themselves.</p>
            <p>We don't have a way to get consent from the subject of a page. We rely on the judgment of the page's creator and contributors, along with the access controls described on our <button type="button" className="mkt-inline-link" onClick={() => onNavigate("our-promise")}>Our Promise</button> page (public, invite-only, or private), to keep what's shared appropriate to who can see it.</p>
          </section>

          <section>
            <h2>Children's Data</h2>
            <p>And Then is not directed at children, and we don't knowingly collect account information from anyone under 18. Photos and stories submitted to a page frequently include children, grandchildren, and other minors, as part of the memories being shared about the person the page honors. That content is submitted by an adult contributor, at their discretion, under the page's existing privacy and access settings.</p>
          </section>

          <section>
            <h2>Data Retention and Deletion</h2>
            <p>Pages don't expire and content isn't automatically deleted. As we say elsewhere on the site: nothing on a page is deleted, archived, or taken down unless the page's steward decides it's time.</p>
            <p>If you want something removed:</p>
            <ul>
              <li>The page's creator or steward can delete any memory on their page, or the whole page, at any time.</li>
              <li>A contributor can ask us to remove a memory they personally submitted, even if the page's creator wants to keep the page as-is.</li>
              <li>Account information is deleted when you close your account, except where we're required to keep records (for example, payment records for tax purposes) for 10 years.</li>
            </ul>
            <p>Email <a href="mailto:hello@myandthen.com">hello@myandthen.com</a> to request removal of anything.</p>
          </section>

          <section>
            <h2>Your Rights and Choices</h2>
            <p>You can access, correct, or delete the information tied to your account at any time by emailing <a href="mailto:hello@myandthen.com">hello@myandthen.com</a>.</p>
            <p>You can export everything on a page you steward, in full, whenever you want it. This isn't a request that goes into a queue; it's a feature built into the product for exactly this purpose.</p>
            <p>Depending on where you live, you may have additional rights under laws like the California Consumer Privacy Act or similar state laws.</p>
          </section>

          <section>
            <h2>Data Security</h2>
            <p>We rely on our infrastructure providers' security practices, including encryption in transit and at rest, access controls, and regular security updates, rather than maintaining our own servers. No system is perfectly secure, and we can't guarantee against every possible breach, but we limit who can access page content to what's needed to operate the service, and we don't store full payment card numbers ourselves.</p>
          </section>

          <section>
            <h2>Changes to This Policy</h2>
            <p>If we make a material change to how we handle your data, we'll notify page creators by email before it takes effect, and we'll update the effective date at the top of this page. Minor clarifications may be made without notice.</p>
          </section>

          <section>
            <h2>Contact Us</h2>
            <p>Questions about this policy, or about your data: <a href="mailto:hello@myandthen.com">hello@myandthen.com</a>. A person will respond, not a bot.</p>
          </section>
        </div>
      </div>

      <footer className="mkt-footer page-wrap">
        <span className="mkt-wordmark" style={{ cursor: "default" }}>
          <span className="mkt-wordmark-line" aria-hidden="true" />
          <span className="mkt-wordmark-text">And Then</span>
          <span className="mkt-wordmark-dots" aria-hidden="true">…</span>
        </span>
        <div className="mkt-footer-links">
          <button className="mkt-footer-link" onClick={() => onNavigate("home")}>Home</button>
          <button className="mkt-footer-link" onClick={() => onNavigate("our-promise")}>Our Promise</button>
          <button className="mkt-footer-link" onClick={() => onNavigate("privacy")}>Privacy</button>
          <button className="mkt-footer-link">Contact</button>
        </div>
        <div className="mkt-footer-copy">© 2026 And Then</div>
      </footer>
    </div>
  );
}
