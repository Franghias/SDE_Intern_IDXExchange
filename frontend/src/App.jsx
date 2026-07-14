import { useState } from 'react';
import Sidebar from './components/Sidebar';
import IntroductionPage from './pages/IntroductionPage';
import ListingsPage from './pages/ListingsPage';
import './stylesheets/App.css';

/**
 * Main application component that manages page navigation.
 * Renders a sidebar and the currently active page (Introduction or Search).
 */
function App() {
  const [currentPage, setCurrentPage] = useState('introduction');

  return (
    <div className="app-layout">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="app-content">
        {currentPage === 'introduction' && (
          <IntroductionPage onNavigateToSearch={() => setCurrentPage('search')} />
        )}
        {currentPage === 'search' && <ListingsPage />}
      </main>
    </div>
  );
}

export default App;
