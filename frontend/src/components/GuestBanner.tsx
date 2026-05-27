import { useStore } from '../store';
import { t } from '../translations';

export default function GuestBanner() {
  const { state, goPage, lang } = useStore();

  if (!state.isGuest) return null;

  return (
    <div className="guest-bar">
      <div style={{ fontSize: 12, color: 'var(--blue-dark)', lineHeight: 1.45, flex: 1 }}>
        {t(lang, 'guestNotice')}
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button className="sbtn" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => goPage('auth')}>
          {t(lang, 'signIn')}
        </button>
        <button className="abtn" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => goPage('auth')}>
          {t(lang, 'createAccount')}
        </button>
      </div>
    </div>
  );
}
