import { useLocation, useNavigate } from 'react-router-dom';
import { useFavorites } from '../hooks/useFavorites';
import '../stylesheets/Sidebar.css';

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { favoriteCount } = useFavorites();

  const navItems = [
    { id: 'introduction', label: 'Introduction', icon: '🏠', path: '/' },
    { id: 'search', label: 'Search', icon: '🔍', path: '/search' },
    { id: 'chat-search', label: 'AI Search', icon: '🤖', path: '/chat-search' },
    { id: 'favorites', label: 'Favorites', icon: '❤️', path: '/favorites', badge: favoriteCount },
    { id: 'openhouses', label: 'Open Houses', icon: '📅', path: '/openhouses' },
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
            <span className="sidebar__link-label">{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span className="sidebar__badge">{item.badge}</span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
