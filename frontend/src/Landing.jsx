function Icon({ name }) {
  return <span className="material-symbols-outlined">{name}</span>;
}

export default function Landing({ onContinue }) {
  return (
    <div className="landing">
      <div className="landing-inner">
        <span className="landing-badge">
          <Icon name="bolt" />A focused collaborative document editor
        </span>
        <h1>
          Writing without distraction.
          <br />
          Collaboration without bloat.
        </h1>
        <p className="landing-sub">
          Ajaia Docs is a lightweight editor for structured writing — pick a
          user, start typing, and share with your team.
        </p>
        <div className="landing-actions">
          <button className="primary-btn landing-cta" onClick={onContinue}>
            Continue to Document Editor
            <Icon name="arrow_forward" />
          </button>
        </div>
        <p className="landing-hint">
          No sign-up required · switch between seeded demo users · autosaves
          as you type
        </p>

        <div className="landing-cards">
          <div className="landing-card">
            <span className="landing-card-icon">
              <Icon name="add" />
            </span>
            <h3>New document</h3>
            <p>Start with a clean canvas and rich-text formatting.</p>
          </div>
          <div className="landing-card">
            <span className="landing-card-icon">
              <Icon name="group" />
            </span>
            <h3>Share with your team</h3>
            <p>Grant a seeded user view &amp; edit access by email.</p>
          </div>
          <div className="landing-card">
            <span className="landing-card-icon">
              <Icon name="upload_file" />
            </span>
            <h3>Import markdown / text</h3>
            <p>Bring in a .txt or .md file as a new document.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
