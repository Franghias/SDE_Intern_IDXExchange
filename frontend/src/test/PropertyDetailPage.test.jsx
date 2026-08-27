import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropertyDetailPage from '../pages/PropertyDetailPage';
import * as propertyApi from '../api/propertyApi';

vi.mock('../api/propertyApi');

const MOCK_PROPERTY_DETAIL = {
  listingId: '1118422731',
  displayId: '1118422731',
  address: '1461 Laurel Way',
  city: 'Beverly Hills',
  state: 'CA',
  zipCode: '90210',
  listPrice: 3950000,
  beds: 4,
  baths: 5.0,
  sqft: 3677,
  yearBuilt: 1973,
  description: 'Opportunity to reimagine a Classic 70s Architectural property.',
  photos: '["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"]',
  latitude: 34.099106,
  longitude: -118.418132,
  propertyType: 'Single Family Residence',
  status: 'Active',
  flooring: 'Carpet, Tile, Wood',
  cooling: 'Central Air, High Efficiency',
  heating: 'Central, Solar',
  subdivisionName: 'Laurel Estates',
  associationAmenities: 'Controlled Access, Maintenance Grounds, Management',
  interiorFeatures: 'Bedroom On Main Level, Entrance Foyer',
  roomType: 'Bonus Room, Family Room, Kitchen',
};

const MOCK_OPEN_HOUSES = {
  listingId: '1118422731',
  openHouses: [
    {
      listingId: '1118422731',
      date: '2026-09-15',
      startTime: '13:00:00',
      endTime: '16:00:00',
      status: 'upcoming',
      OpenHouseRemarks: 'Refreshments served!',
      OpenHouseType: 'Public',
    },
  ],
};

function renderPropertyDetailPage(id = '1118422731') {
  return render(
    <MemoryRouter initialEntries={[`/property/${id}`]}>
      <Routes>
        <Route path="/property/:id" element={<PropertyDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PropertyDetailPage Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it('renders loading spinner initially while fetching data', () => {
    propertyApi.fetchPropertyById.mockImplementation(() => new Promise(() => { }));
    propertyApi.fetchOpenHouses.mockImplementation(() => new Promise(() => { }));

    renderPropertyDetailPage();
    expect(screen.getByText(/Loading property details/i)).toBeInTheDocument();
  });

  it('renders error state when fetchPropertyById fails', async () => {
    propertyApi.fetchPropertyById.mockRejectedValue(new Error('Property not found'));
    propertyApi.fetchOpenHouses.mockResolvedValue({ openHouses: [] });

    renderPropertyDetailPage('9999');

    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Property not found')).toBeInTheDocument();
    });
  });

  it('renders main property info, stats with Square Feet, and description', async () => {
    propertyApi.fetchPropertyById.mockResolvedValue(MOCK_PROPERTY_DETAIL);
    propertyApi.fetchOpenHouses.mockResolvedValue({ openHouses: [] });

    renderPropertyDetailPage();

    await waitFor(() => {
      expect(screen.getByText('$3,950,000')).toBeInTheDocument();
      expect(screen.getByText('1461 Laurel Way')).toBeInTheDocument();
      expect(screen.getByText('Beverly Hills, CA 90210')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Square Feet')).toBeInTheDocument();
      expect(screen.getByText('3,677')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText(/Opportunity to reimagine a Classic 70s/i)).toBeInTheDocument();
    });
  });

  it('renders Listing Agent Information section above description when present', async () => {
    const mockPropertyWithAgent = {
      ...MOCK_PROPERTY_DETAIL,
      listAgentFullName: 'John Smith',
      listAgentOfficePhone: '310-555-0199',
      listAgentEmail: 'john@realty.com',
      listAgentDirectPhone: '310-555-0188',
      listOfficeEmail: 'office@realty.com',
    };
    propertyApi.fetchPropertyById.mockResolvedValue(mockPropertyWithAgent);
    propertyApi.fetchOpenHouses.mockResolvedValue({ openHouses: [] });

    renderPropertyDetailPage();

    await waitFor(() => {
      expect(screen.getByText('Listing Agent Information')).toBeInTheDocument();
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('310-555-0199')).toBeInTheDocument();
      expect(screen.getByText('john@realty.com')).toBeInTheDocument();
      expect(screen.getByText('310-555-0188')).toBeInTheDocument();
      expect(screen.getByText('office@realty.com')).toBeInTheDocument();
    });
  });

  it('renders map with directions link encoded with actual address', async () => {
    propertyApi.fetchPropertyById.mockResolvedValue(MOCK_PROPERTY_DETAIL);
    propertyApi.fetchOpenHouses.mockResolvedValue({ openHouses: [] });

    renderPropertyDetailPage();

    await waitFor(() => {
      const directionsBtn = screen.getByRole('link', { name: /Get Directions/i });
      expect(directionsBtn).toBeInTheDocument();
      expect(directionsBtn).toHaveAttribute(
        'href',
        expect.stringContaining(encodeURIComponent('1461 Laurel Way, Beverly Hills, CA'))
      );
    });
  });

  it('renders dynamic Property Details grid with Title Case labels and extra fields', async () => {
    propertyApi.fetchPropertyById.mockResolvedValue(MOCK_PROPERTY_DETAIL);
    propertyApi.fetchOpenHouses.mockResolvedValue({ openHouses: [] });

    renderPropertyDetailPage();

    await waitFor(() => {
      expect(screen.getByText('Property Details')).toBeInTheDocument();
      expect(screen.getByText('Property Type')).toBeInTheDocument();
      expect(screen.getByText('Single Family Residence')).toBeInTheDocument();
      expect(screen.getByText('Flooring')).toBeInTheDocument();
      expect(screen.getByText('Carpet, Tile, Wood')).toBeInTheDocument();
      expect(screen.getByText('Cooling')).toBeInTheDocument();
      expect(screen.getByText('Central Air, High Efficiency')).toBeInTheDocument();
      expect(screen.getByText('Association Amenities')).toBeInTheDocument();
      expect(screen.getByText('Controlled Access, Maintenance Grounds, Management')).toBeInTheDocument();
      expect(screen.getByText('Interior Features')).toBeInTheDocument();
      expect(screen.getByText('Bedroom On Main Level, Entrance Foyer')).toBeInTheDocument();
    });
  });

  it('renders scheduled open houses when present', async () => {
    propertyApi.fetchPropertyById.mockResolvedValue(MOCK_PROPERTY_DETAIL);
    propertyApi.fetchOpenHouses.mockResolvedValue(MOCK_OPEN_HOUSES);

    renderPropertyDetailPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Open House/i })).toBeInTheDocument();
      expect(screen.getByText('Upcoming')).toBeInTheDocument();
      expect(screen.getByText(/Refreshments served!/i)).toBeInTheDocument();
    });
  });

  it('handles favorite save/unsave toggle button', async () => {
    const user = userEvent.setup();
    propertyApi.fetchPropertyById.mockResolvedValue(MOCK_PROPERTY_DETAIL);
    propertyApi.fetchOpenHouses.mockResolvedValue({ openHouses: [] });

    renderPropertyDetailPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add to favorites/i })).toBeInTheDocument();
    });

    const saveBtn = screen.getByRole('button', { name: /Add to favorites/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Remove from favorites/i })).toBeInTheDocument();
    });
  });
});
