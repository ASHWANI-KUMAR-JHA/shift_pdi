import { useState, useCallback } from 'react';
import Dashboard from './components/Dashboard';
import LetterGenerator from './components/LetterGenerator';
import JCR from './components/JCR';
import JCRSelect from './components/JCRSelect';
import PDI from './components/PDI';
import WorkOrders from './components/WorkOrders';
import InstallationRegister from './components/InstallationRegister';
import PublicInstallationForm from './components/PublicInstallationForm';
import GeoDebug from './components/GeoDebug';
import UserManager from './components/UserManager';
import Login from './components/Login';
import { isAuthenticated, clearSession } from './utils/auth';
import './App.css';

// Public, shareable installation form. No login required so it can be sent
// to field users. Accessed via ?form=install in the URL.
const isPublicForm =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('form') === 'install';

// Optional work order name from the URL (?form=install&workorder=test). When
// present, the installation form constrains the equipment serials to that
// work order's uploaded master list.
const workOrderParam =
  typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('workorder') || ''
    : '';

// Standalone geolocation diagnostic screen. Open with ?geo=debug in the URL.
const isGeoDebug =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('geo') === 'debug';

// Developer mode - bypass login only with ?dev=ashwani
const isDevMode =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('dev') === 'ashwani';

function App() {
  const [loggedIn, setLoggedIn] = useState(() => isDevMode || isAuthenticated());
  const [currentPage, setCurrentPage] = useState(() => {
    // Check URL parameter for page navigation
    const params = new URLSearchParams(window.location.search);
    return params.get('page') || 'dashboard';
  }); // 'dashboard' | 'letterGenerator' | 'workOrders' | ...

  const goToPage = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const goHome = useCallback(() => setCurrentPage('dashboard'), []);

  const handleLogout = useCallback(() => {
    clearSession();
    setLoggedIn(false);
  }, []);

  // Geolocation inspector — no login required, purely a diagnostic view.
  if (isGeoDebug) {
    return <GeoDebug />;
  }

  // Show login page if not authenticated. The public installation form now
  // also requires login so the submitting user is identified on the form.
  if (!loggedIn) {
    return <Login onLoginSuccess={() => setLoggedIn(true)} />;
  }

  // Shareable installation form — opens (after login) with the user's name on top.
  if (isPublicForm) {
    return <PublicInstallationForm onLogout={handleLogout} initialWorkOrder={workOrderParam} />;
  }

  // Show the Letter Generator page
  if (currentPage === 'letterGenerator') {
    return <LetterGenerator onBack={goHome} onLogout={handleLogout} />;
  }

  // Show the Work Orders page
  if (currentPage === 'workOrders') {
    return <WorkOrders onBack={goHome} onLogout={handleLogout} />;
  }

  // Show the JCR (Joint Commissioning Report) page
  if (currentPage === 'jcr') {
    return <JCR onBack={goHome} onLogout={handleLogout} />;
  }

  // Show the JCR Select-by-Work-Order page
  if (currentPage === 'jcrSelect') {
    return <JCRSelect onBack={goHome} onLogout={handleLogout} />;
  }

  // Show the PDI (Pre-Dispatch Inspection) page
  if (currentPage === 'pdi') {
    return <PDI onBack={goHome} onLogout={handleLogout} />;
  }

  // Show the Installation Register page
  if (currentPage === 'installations') {
    return <InstallationRegister onBack={goHome} onLogout={handleLogout} />;
  }

  // Show the User Manager page
  if (currentPage === 'users') {
    return <UserManager onBack={goHome} onLogout={handleLogout} />;
  }

  // Default landing page.
  return <Dashboard onNavigate={goToPage} onLogout={handleLogout} />;
}

export default App;
