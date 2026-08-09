import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import IntroductionPage from './pages/IntroductionPage';
import ListingsPage from './pages/ListingsPage';
import FavoritesPage from './pages/FavoritesPage';
import OpenHousesPage from './pages/OpenHousesPage';
import ChatSearchPage from './pages/ChatSearchPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import './stylesheets/App.css';

/**
 * Main application component with React Router.
 * Sidebar is fixed on all pages. Main content area swaps via routing.
 * ErrorBoundary catches render crashes in any page and shows a recovery UI.
 */
function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="app-content">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<IntroductionPage />} />
              <Route path="/search" element={<ListingsPage />} />
              <Route path="/chat-search" element={<ChatSearchPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/openhouses" element={<OpenHousesPage />} />
              <Route path="/property/:id" element={<PropertyDetailPage />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
