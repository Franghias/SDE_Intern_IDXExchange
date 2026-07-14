import '../stylesheets/Sidebar.css';

function Sidebar({ currentPage, onNavigate }) {
  const navItems = [
    { id: 'introduction', label: 'Introduction', icon: '🏠' },
    { id: 'search', label: 'Search', icon: '🔍' },
  ];

  return (
    <aside className="sidebar" id="sidebar-nav">
      <div className="sidebar__brand">
        <h1 className="sidebar__logo">
          <span>IDX</span>Exchange
        </h1>
        <p className="sidebar__tagline">Property Listings</p>
      </div>

      <nav className="sidebar__nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            id={`nav-${item.id}`}
            className={`sidebar__link${currentPage === item.id ? ' sidebar__link--active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="sidebar__link-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
