import './pages.css';

export default function Journal() {
  return (
    <div className="page">
      <header className="page-header">
        <h2>Daily journal</h2>
        <p>Write freely, reflect deeply, and build a personal archive of your experiences.</p>
      </header>

      <section className="dashboard-section">
        <h3 className="ooulume-section-title">Today&apos;s prompt</h3>
        <p>Open the writing editor in your mobile or desktop app to begin. Prompts refresh every day at midnight.</p>
      </section>

      <section className="dashboard-section">
        <h3 className="ooulume-section-title">Tips</h3>
        <ul className="dashboard-list">
          <li>
            <h4>Capture the moment</h4>
            <p>Use entries to log feelings, events, and gratitude in one place.</p>
          </li>
          <li>
            <h4>Tag generously</h4>
            <p>Tags make it easier to filter through your past and identify trends.</p>
          </li>
          <li>
            <h4>Revisit weekly</h4>
            <p>Spend a few minutes every week reflecting on your highlights and challenges.</p>
          </li>
        </ul>
      </section>
    </div>
  );
}
