import type { Screen } from '../store/appSlice';
import { BrandMark } from './ui';

type NavItem = { screen: Screen; label: string; icon: string };

// Simple 24px line icons (stroke paths) so the bottom bar reads without text.
const icons: Record<string, string> = {
  home: 'M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5',
  book: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15ZM4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5',
  heart: 'M12 20s-8-4.9-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.1 12 20 12 20Z',
  run: 'M13 4.5a1.5 1.5 0 1 0 0 .01M9 21l2.5-6 3 2.5V21M7 12l3-4h4l2.5 3.5H19M11.5 15 10 8',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16ZM10 20.5h4',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01',
  shield: 'M12 3 5 6v5c0 4.5 3 8.2 7 10 4-1.8 7-5.5 7-10V6l-7-3Z'
};

export function NavIcon({ name }: { name: string }) {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={icons[name]} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const learnerItems: NavItem[] = [
  { screen: 'dashboard', label: 'Ahabanza', icon: 'home' },
  { screen: 'library', label: 'Amasomo', icon: 'book' },
  { screen: 'ncd', label: 'Indwara', icon: 'heart' },
  { screen: 'exercise', label: 'Imyitozo', icon: 'run' },
  { screen: 'reminders', label: 'Ibyibutsa', icon: 'bell' }
];

export function AppNav({
  currentScreen,
  userName,
  isOnline,
  isSignedIn,
  isStaff,
  onNavigate,
  onSignIn,
  onSignOut
}: {
  currentScreen: Screen;
  userName: string;
  isOnline: boolean;
  isSignedIn: boolean;
  isStaff: boolean;
  onNavigate: (screen: Screen) => void;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  // The knowledge check belongs to the NCD module, the risk check to the dashboard.
  const activeScreen = currentScreen === 'checkup' ? 'ncd' : ['risk', 'paths'].includes(currentScreen) ? 'dashboard' : currentScreen;
  const topItems = [...learnerItems, { screen: 'faq' as Screen, label: 'Ubufasha', icon: 'help' }];
  if (isStaff) topItems.push({ screen: 'admin', label: 'Ubuyobozi', icon: 'shield' });

  return (
    <>
      <header className="app-nav">
        <button className="app-nav-brand" onClick={() => onNavigate('dashboard')} aria-label="Baho ahabanza">
          <BrandMark />
        </button>
        <nav className="app-nav-links" aria-label="Ibice bya Baho">
          {topItems.map((item) => (
            <button
              key={item.screen}
              className={`app-nav-link ${activeScreen === item.screen ? 'active' : ''}`}
              aria-current={activeScreen === item.screen ? 'page' : undefined}
              onClick={() => onNavigate(item.screen)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="app-nav-account">
          <span className={`connection-pill ${isOnline ? 'online' : 'offline'}`} title={isOnline ? 'Kuri internet' : 'Nta internet'}>
            <span /> {isOnline ? 'Kuri internet' : 'Nta internet'}
          </span>
          <button className="app-nav-help" onClick={() => onNavigate('faq')} aria-label="Ubufasha"><NavIcon name="help" /></button>
          <button
            className={`account-avatar avatar-button ${currentScreen === 'profile' ? 'active' : ''}`}
            onClick={() => onNavigate('profile')}
            title="Umwirondoro wanjye"
            aria-label="Umwirondoro wanjye"
            aria-current={currentScreen === 'profile' ? 'page' : undefined}
          >
            {(userName || 'B').trim().charAt(0).toUpperCase()}
          </button>
          {isSignedIn
            ? <button className="app-nav-account-button" onClick={onSignOut}>Sohoka</button>
            : <button className="app-nav-account-button" onClick={onSignIn}>Injira</button>}
        </div>
      </header>

      <nav className="bottom-nav" aria-label="Ibice by'ingenzi">
        {learnerItems.map((item) => (
          <button
            key={item.screen}
            className={activeScreen === item.screen ? 'active' : ''}
            aria-current={activeScreen === item.screen ? 'page' : undefined}
            onClick={() => onNavigate(item.screen)}
          >
            <NavIcon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
