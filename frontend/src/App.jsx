import ListingsPage from './pages/ListingsPage';
import './stylesheets/App.css';

function App() {
  return (
    <>
      <header className="app-header">
        <h1 className="app-header__title">
          <span>IDX</span>Exchange
        </h1>
        <p className="app-header__subtitle">Browse property listings</p>
      </header>
      <main>
        <ListingsPage />
      </main>
    </>
  );
}

export default App;
