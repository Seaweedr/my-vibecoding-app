import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { TodayPage } from './pages/TodayPage';
import { TripsPage } from './pages/TripsPage';
import { CapturePage } from './pages/CapturePage';
import { StatsPage } from './pages/StatsPage';
import { SettingsPage } from './pages/SettingsPage';

import { StorageProvider } from './context/StorageContext';
import { CreateTripPage } from './pages/CreateTripPage';
import { TripDetailPage } from './pages/TripDetailPage';
import { AddExpensePage } from './pages/AddExpensePage';
import { SettingsLanguagePage } from './pages/settings/SettingsLanguagePage';
import { SettingsBackupPage } from './pages/settings/SettingsBackupPage';
import { SettingsNotificationsPage } from './pages/settings/SettingsNotificationsPage';
import { SettingsCompanionsPage } from './pages/settings/SettingsCompanionsPage';
import { TripStoryPage } from './pages/TripStoryPage';
import { OnboardingPage } from './pages/OnboardingPage';

function App() {
  return (
    <StorageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/story/:tripId" element={<TripStoryPage />} />
          <Route path="/trips/:tripId" element={<TripDetailPage />} />

          <Route path="/" element={<Layout />}>
            <Route index element={<TodayPage />} />
            <Route path="trips" element={<TripsPage />} />
            <Route path="trips/new" element={<CreateTripPage />} />
            <Route path="trips/:tripId/add-expense" element={<AddExpensePage />} />
            <Route path="trips/:tripId/story" element={<TripStoryPage />} />
            <Route path="capture" element={<CapturePage />} />
            <Route path="stats" element={<StatsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="settings/language" element={<SettingsLanguagePage />} />
            <Route path="settings/backup" element={<SettingsBackupPage />} />
            <Route path="settings/notifications" element={<SettingsNotificationsPage />} />
            <Route path="settings/companions" element={<SettingsCompanionsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StorageProvider>
  );
}

export default App;
