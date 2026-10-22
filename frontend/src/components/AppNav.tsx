import type { Screen } from '../store/appSlice';
import { BrandMark } from './ui';

type NavItem = { screen: Screen; label: string; icon: string };

// Line icons, used only in the phone tab bar.
const icons: Record<string, string> = {
  home: 'M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5',
  book: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15ZM4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5',
  heart: 'M12 20s-8-4.9-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.1 12 20 12 20Z',
  run: 'M13 4.5a1.5 1.5 0 1 0 0 .01M9 21l2.5-6 3 2.5V21M7 12l3-4h4l2.5 3.5H19M11.5 15 10 8',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16ZM10 20.5h4'
};

export function NavIcon({ name }: { name: string }) {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={icons[name]} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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

const roleNames: Record<string, string> = {
  admin: 'Umuyobozi',
  creator: 'Umwanditsi',
  specialist: 'Inzobere',
  learner: 'Umunyeshuri'
};

// Utility bar + masthead + main navigation. Public pages (landing, sign-in,
// onboarding) use it without the navigation.
export function SiteHeader({
  currentScreen,
  userName,
  role,
  isOnline,
  isSignedIn,
  isStaff,
  showNav,
  onNavigate,
  onSignIn,
  onSignOut,
  onHome
}: {
  currentScreen: Screen;
  userName: string;
  role: string | null;
  isOnline: boolean;
  isSignedIn: boolean;
  isStaff: boolean;
  showNav: boolean;
  onNavigate: (screen: Screen) => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onHome: () => void;
}) {
  // The knowledge check belongs to the NCD section, the health profile and paths to home.
  const activeScreen = currentScreen === 'checkup' ? 'ncd' : ['risk', 'paths'].includes(currentScreen) ? 'dashboard' : currentScreen;
  const items = [...learnerItems, { screen: 'faq' as Screen, label: 'Ubufasha', icon: '' }];
  if (isStaff) items.push({ screen: 'admin', label: 'Ubuyobozi', icon: '' });

  return (
    <>
      <div className="utility-bar">
        <div className="container">
          <span className="hide-sm">Inyigisho ku buzima mu Kinyarwanda · Ntisimbura muganga</span>
          <span className={isOnline ? 'status-online' : 'status-offline'}>{isOnline ? 'Kuri internet' : 'Nta internet'}</span>
        </div>
      </div>
      <header className="masthead">
        <div className="container">
          <button className="brand" onClick={onHome} aria-label="Baho, ahabanza"><BrandMark /></button>
          <div className="masthead-actions">
            {showNav && (
              <button
                className={`account-link ${currentScreen === 'profile' ? 'active' : ''}`}
                onClick={() => onNavigate('profile')}
                aria-label={`Umwirondoro wanjye: ${userName || 'Umushyitsi'}`}
                aria-current={currentScreen === 'profile' ? 'page' : undefined}
              >
                <span className="account-initial" aria-hidden="true">{(userName || 'B').trim().charAt(0).toUpperCase()}</span>
                <span className="account-text">
                  <span>{userName || 'Umushyitsi'}</span>
                  <small>{isSignedIn && role ? roleNames[role] ?? role : 'Umwirondoro wanjye'}</small>
                </span>
              </button>
            )}
            {isSignedIn
              ? <button className="btn btn-secondary btn-sm" onClick={onSignOut}>Sohoka</button>
              : <button className="btn btn-secondary btn-sm" onClick={onSignIn}>Injira</button>}
          </div>
        </div>
      </header>
      {showNav && (
        <nav className="main-nav" aria-label="Ibice bya Baho">
          <div className="container">
            {items.map((item) => (
              <button
                key={item.screen}
                className={activeScreen === item.screen ? 'active' : ''}
                aria-current={activeScreen === item.screen ? 'page' : undefined}
                onClick={() => onNavigate(item.screen)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}

export function TabBar({ currentScreen, onNavigate }: { currentScreen: Screen; onNavigate: (screen: Screen) => void }) {
  const activeScreen = currentScreen === 'checkup' ? 'ncd' : ['risk', 'paths'].includes(currentScreen) ? 'dashboard' : currentScreen;
  return (
    <nav className="tab-bar" aria-label="Ibice by'ingenzi">
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
  );
}

export function SiteFooter({ onNavigate }: { onNavigate?: (screen: Screen) => void }) {
  return (
    <footer className="site-footer">
      <div className="container">
        <div>
          <h4>Baho</h4>
          <p>Urubuga rw'inyigisho ku ndwara zitandura (umuvuduko w'amaraso, diyabete, indwara z'umutima na kanseri) mu Kinyarwanda. Amasomo yandikwa n'abakozi b'ubuzima kandi agasuzumwa n'inzobere mbere yo gusohoka.</p>
        </div>
        <div>
          <h4>Serivisi</h4>
          <ul>
            <li><button onClick={() => onNavigate?.('library')}>Amasomo</button></li>
            <li><button onClick={() => onNavigate?.('ncd')}>Indwara zitandura</button></li>
            <li><button onClick={() => onNavigate?.('checkup')}>Isuzuma ry'ubumenyi</button></li>
          </ul>
        </div>
        <div>
          <h4>Ubufasha</h4>
          <ul>
            <li><button onClick={() => onNavigate?.('faq')}>Ibibazo bikunze kubazwa</button></li>
            <li><button onClick={() => onNavigate?.('faq')}>Tanga raporo</button></li>
          </ul>
        </div>
      </div>
      <div className="footer-base">
        <div className="container">
          <span>Baho · Umushinga w'ubushakashatsi (capstone), African Leadership University</span>
          <span>Amakuru atangwa ntasimbura inama za muganga.</span>
        </div>
      </div>
    </footer>
  );
}
