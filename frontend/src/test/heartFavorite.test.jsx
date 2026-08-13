import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropertyCard from '../components/PropertyCard';
import PropertyDetailPage from '../pages/PropertyDetailPage';
import OpenHousesPage from '../pages/OpenHousesPage';
import ListingsPage from '../pages/ListingsPage';
import FavoritesPage from '../pages/FavoritesPage';
import * as propertyApi from '../api/propertyApi';

vi.mock('../api/propertyApi');

const MOCK_PROPERTY = {
  propertyId: '1001',
  displayId: '1001',
  listingId: 'L-1001',
  listPrice: 500000,
  address: '123 Main Street',
  city: 'Los Angeles',
  state: 'CA',
  zipCode: '90210',
  beds: 3,
  baths: 2,
  sqft: 1500,
  photos: '["https://example.com/photo1.jpg"]',
  status: 'Active',
};

const MOCK_OPEN_HOUSE = {
  listingId: 'OH-101',
  propertyId: '1001',
  openHouseDate: '2026-09-01',
  startTime: '10:00:00',
  endTime: '12:00:00',
  status: 'active',
  address: '789 Palm Ave',
  city: 'Miami',
  state: 'FL',
  zipCode: '33101',
  listPrice: 620000,
  beds: 3,
  baths: 2,
  sqft: 1800,
  photos: '["https://example.com/oh1.jpg"]',
};

describe('Heart Favorite Component Across Pages', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  describe('PropertyCard Component', () => {
    it('renders favorite heart button and handles toggle click', async () => {
      const user = userEvent.setup();
      const onToggleFavorite = vi.fn();

      render(
        <MemoryRouter>
          <PropertyCard
            property={MOCK_PROPERTY}
            isFavorite={false}
            onToggleFavorite={onToggleFavorite}
          />
        </MemoryRouter>
      );

      const favButton = screen.getByRole('button', { name: /add to favorites/i });
      expect(favButton).toBeInTheDocument();
      expect(favButton).toHaveTextContent('♡');

      await user.click(favButton);
      expect(onToggleFavorite).toHaveBeenCalledWith('1001');
    });

    it('renders active heart button when property is favorited', () => {
      render(
        <MemoryRouter>
          <PropertyCard property={MOCK_PROPERTY} isFavorite={true} onToggleFavorite={() => {}} />
        </MemoryRouter>
      );

      const favButton = screen.getByRole('button', { name: /remove from favorites/i });
      expect(favButton).toBeInTheDocument();
      expect(favButton).toHaveTextContent('♥');
      expect(favButton).toHaveClass('property-card__favorite-btn--active');
    });
  });

  describe('OpenHousesPage', () => {
    it('renders heart button on open house cards and toggles favorite in localStorage', async () => {
      const user = userEvent.setup();
      propertyApi.fetchAllOpenHouses.mockResolvedValue({
        total: 1,
        limit: 20,
        offset: 0,
        results: [MOCK_OPEN_HOUSE],
      });

      render(<OpenHousesPage />);

      await waitFor(() => {
        expect(propertyApi.fetchAllOpenHouses).toHaveBeenCalled();
      });

      const favButton = await screen.findByRole('button', { name: /add to favorites/i });
      expect(favButton).toBeInTheDocument();
      expect(favButton).toHaveTextContent('♡');

      await user.click(favButton);

      const activeFavButton = await screen.findByRole('button', { name: /remove from favorites/i });
      expect(activeFavButton).toBeInTheDocument();
      expect(activeFavButton).toHaveTextContent('♥');

      const savedFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      expect(savedFavorites).toContain('1001');
    });
  });

  describe('PropertyDetailPage', () => {
    it('renders favorite heart Save button in header and toggles favorite status', async () => {
      const user = userEvent.setup();
      propertyApi.fetchPropertyById.mockResolvedValue(MOCK_PROPERTY);
      propertyApi.fetchOpenHouses.mockResolvedValue({ openHouses: [] });

      render(
        <MemoryRouter initialEntries={['/property/1001']}>
          <Routes>
            <Route path="/property/:id" element={<PropertyDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(propertyApi.fetchPropertyById).toHaveBeenCalledWith('1001');
      });

      const favButton = await screen.findByRole('button', { name: /add to favorites/i });
      expect(favButton).toBeInTheDocument();
      expect(favButton).toHaveTextContent('♡Save');

      await user.click(favButton);

      const activeFavButton = await screen.findByRole('button', { name: /remove from favorites/i });
      expect(activeFavButton).toBeInTheDocument();
      expect(activeFavButton).toHaveTextContent('♥Saved');

      const savedFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      expect(savedFavorites).toContain('1001');
    });
  });

  describe('ListingsPage', () => {
    it('renders favorite heart button on property cards and updates favorite state on click', async () => {
      const user = userEvent.setup();
      propertyApi.fetchProperties.mockResolvedValue({
        total: 1,
        limit: 20,
        offset: 0,
        results: [MOCK_PROPERTY],
      });

      render(
        <MemoryRouter>
          <ListingsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(propertyApi.fetchProperties).toHaveBeenCalled();
      });

      const favButton = await screen.findByRole('button', { name: /add to favorites/i });
      expect(favButton).toBeInTheDocument();

      await user.click(favButton);

      const activeFavButton = await screen.findByRole('button', { name: /remove from favorites/i });
      expect(activeFavButton).toBeInTheDocument();

      const savedFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      expect(savedFavorites).toContain('1001');
    });
  });

  describe('FavoritesPage', () => {
    it('renders saved favorite cards and removes them when favorite heart button is clicked', async () => {
      const user = userEvent.setup();
      localStorage.setItem('favorites', JSON.stringify(['1001']));

      propertyApi.fetchFavoriteProperties.mockResolvedValue({
        total: 1,
        limit: 20,
        offset: 0,
        results: [MOCK_PROPERTY],
      });

      render(
        <MemoryRouter>
          <FavoritesPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(propertyApi.fetchFavoriteProperties).toHaveBeenCalled();
      });

      const activeFavButton = await screen.findByRole('button', { name: /remove from favorites/i });
      expect(activeFavButton).toBeInTheDocument();

      await user.click(activeFavButton);

      const savedFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      expect(savedFavorites).not.toContain('1001');
    });
  });
});
