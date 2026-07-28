import { useLocation, useNavigate } from 'react-router-dom';
import '../stylesheets/Sidebar.css';

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { id: 'introduction', label: 'Introduction', icon: '🏠', path: '/' },
    { id: 'search', label: 'Search', icon: '🔍', path: '/search' },
  ];

  /**
   * Determine if a nav item is active based on the current route.
   */
  function isActive(item) {
    if (item.path === '/') return location.pathname === '/';
    return location.pathname.startsWith(item.path);
  }

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
            className={`sidebar__link${isActive(item) ? ' sidebar__link--active' : ''}`}
            onClick={() => navigate(item.path)}
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
