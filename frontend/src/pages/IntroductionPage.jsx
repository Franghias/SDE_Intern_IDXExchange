import '../stylesheets/IntroductionPage.css';

const FEATURES = [
  {
    icon: '🔍',
    title: 'Search & Filter',
    description: 'Find properties by city, state, ZIP code, price range, bedrooms, and bathrooms with powerful combined filters.',
  },
  {
    icon: '📊',
    title: 'Real-Time Data',
    description: 'Browse over 50,000 property listings pulled directly from the MLS database, always up to date.',
  },
  {
    icon: '📸',
    title: 'Photo Galleries',
    description: 'View high-quality property photos with full-screen galleries and interactive image carousels.',
  },
  {
    icon: '🏡',
    title: 'Open House Info',
    description: 'See upcoming open house schedules with dates, times, and agent remarks for every listing.',
  },
];

function IntroductionPage({ onNavigateToSearch }) {
  return (
    <div className="intro-page">
      <section className="intro-page__hero">
        <h1 className="intro-page__headline">
          Discover Your <span>Dream Property</span>
        </h1>
        <p className="intro-page__subtext">
          Explore thousands of real estate listings with advanced search, detailed property data,
          and open house schedules — all in one place.
        </p>
        <button
          className="intro-page__cta"
          id="cta-search"
          onClick={onNavigateToSearch}
        >
          Start Searching
        </button>
      </section>

      <section className="intro-page__features">
        <h2 className="intro-page__section-title">What We Offer</h2>
        <div className="intro-page__feature-grid">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="intro-page__feature-card">
              <span className="intro-page__feature-icon">{feature.icon}</span>
              <h3 className="intro-page__feature-title">{feature.title}</h3>
              <p className="intro-page__feature-desc">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default IntroductionPage;
