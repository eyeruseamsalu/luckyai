import { useStore } from '../store';

export default function Notifications() {
  const { state, markAllRead } = useStore();
  const unread = state.notifications.filter(n => !n.read).length;

  const iconColor: Record<string, string> = {
    ta: 'var(--amber-light)',
    tp: 'var(--purple-light)',
    tg: 'var(--green-light)',
    ts: 'var(--teal-light)',
  };
  const textColor: Record<string, string> = {
    ta: 'var(--amber-dark)',
    tp: 'var(--purple-dark)',
    tg: 'var(--green-dark)',
    ts: 'var(--teal-dark)',
  };

  return (
    <div className="pg on" id="p-notif">
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 2 }}>Notifications</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                {unread > 0 ? `${unread} unread` : 'All caught up!'}
              </div>
            </div>
            {unread > 0 && (
              <button className="sbtn" style={{ fontSize: 11 }} onClick={markAllRead}>Mark all read</button>
            )}
          </div>

          {state.notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 12, color: 'var(--text2)' }}>
              <i className="ti ti-bell-off" style={{ fontSize: 32, display: 'block', marginBottom: 10, color: 'var(--text3)' }} />
              No notifications yet — start playing to get updates!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {state.notifications.map((n, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 11, padding: '11px 0',
                    borderBottom: i < state.notifications.length - 1 ? '0.5px solid var(--border)' : 'none',
                    background: n.read ? 'transparent' : 'transparent',
                  }}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                    background: iconColor[n.color] || 'var(--bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, color: textColor[n.color] || 'var(--text2)',
                  }}>
                    <i className={`ti ${n.icon}`} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, lineHeight: 1.5, fontWeight: n.read ? 400 : 500, marginBottom: 2 }}>
                      {n.msg}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>{n.time}</div>
                  </div>
                  {!n.read && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--amber)', flexShrink: 0, marginTop: 5 }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {state.notifications.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: 'var(--text2)' }}>
            Showing {state.notifications.length} notification{state.notifications.length !== 1 ? 's' : ''} · Notifications are cleared after 30 days
          </div>
        )}
      </div>
    </div>
  );
}
