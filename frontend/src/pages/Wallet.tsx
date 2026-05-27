import { useState } from 'react';
import { useStore } from '../store';
import { t } from '../translations';

const METHODS = [
  { id: 'chapa',    label: 'Chapa',    icon: 'ti-credit-card-pay', color: '#E8F5F0', border: '#00BFA5' },
  { id: 'telebirr', label: 'Telebirr', icon: 'ti-device-mobile',   color: 'var(--teal-light)', border: 'var(--teal)' },
  { id: 'cbe',      label: 'CBE Birr', icon: 'ti-building-bank',   color: 'var(--blue-light)', border: 'var(--blue)' },
  { id: 'card',     label: 'Visa/MC',  icon: 'ti-credit-card',     color: 'var(--purple-light)', border: 'var(--purple)' },
];

export default function Wallet() {
  const { state, lang, addBalance, addTransaction, addNotification } = useStore();
  const [method, setMethod] = useState('telebirr');
  const [amount, setAmount] = useState('');
  const [toast, setToast] = useState<{ msg: string; cls: string } | null>(null);
  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit');

  const showT = (msg: string, cls: string) => { setToast({ msg, cls }); setTimeout(() => setToast(null), 3200); };

  const doDeposit = () => {
    const a = parseFloat(amount);
    if (!a || a < 10) { showT('Minimum deposit is 10 ETB', 'tx'); return; }
    if (a > 50000) { showT('Maximum single deposit is 50,000 ETB', 'tx'); return; }
    addBalance(a);
    addTransaction(`${METHODS.find(m => m.id === method)?.label} deposit`, a, 'in');
    addNotification('ti-coin', 'tg', `${a.toLocaleString()} ETB deposited via ${METHODS.find(m => m.id === method)?.label}`);
    showT(`${a.toLocaleString()} ETB added to your wallet`, 'ts');
    setAmount('');
  };

  const doWithdraw = () => {
    const a = parseFloat(amount);
    if (!a || a < 50) { showT('Minimum withdrawal is 50 ETB', 'tx'); return; }
    if (a > state.balance) { showT('Insufficient balance', 'tx'); return; }
    addBalance(-a);
    addTransaction(`Withdrawal to ${METHODS.find(m => m.id === method)?.label}`, -a, 'out');
    showT(`${a.toLocaleString()} ETB withdrawal initiated — arrives in 1–3 minutes`, 'ts');
    setAmount('');
  };

  return (
    <div className="pg on" id="p-wallet">
      <div style={{ maxWidth: 540, margin: '0 auto' }}>
        {/* Balance cards */}
        <div className="g2" style={{ marginBottom: 13 }}>
          <div className="card">
            <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 5 }}>{t(lang, 'walletBalanceLabel')}</div>
            <div style={{ fontSize: 28, fontWeight: 600, marginBottom: 3 }}>{Math.round(state.balance).toLocaleString()} ETB</div>
            <span className="tag tg">{t(lang, 'available')}</span>
          </div>
          <div className="card" style={{ background: 'var(--star-light)', border: '0.5px solid var(--star)' }}>
            <div style={{ fontSize: 11, color: 'var(--star-dark)', marginBottom: 5 }}>{t(lang, 'starsBalanceWallet')}</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--star-dark)', marginBottom: 3 }}>{state.starsBalance.toLocaleString()} ★</div>
            <span className="ts-tag tag">{t(lang, 'earnable')}</span>
          </div>
        </div>

        {/* Deposit / Withdraw */}
        <div className="card" style={{ marginBottom: 13 }}>
          <div className="auth-tab-row" style={{ marginBottom: 14 }}>
            <button className={`auth-tab${tab === 'deposit' ? ' on' : ''}`} onClick={() => setTab('deposit')}>{t(lang, 'deposit')}</button>
            <button className={`auth-tab${tab === 'withdraw' ? ' on' : ''}`} onClick={() => setTab('withdraw')}>{t(lang, 'withdraw')}</button>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div className="flbl">{t(lang, 'paymentMethod')}</div>
            <div style={{ display: 'flex', gap: 7 }}>
              {METHODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  style={{
                    flex: 1, padding: '9px 6px', borderRadius: 9,
                    border: `${method === m.id ? '2px' : '0.5px'} solid ${method === m.id ? m.border : 'var(--border2)'}`,
                    background: method === m.id ? m.color : 'none',
                    cursor: 'pointer', textAlign: 'center', transition: 'all .12s',
                  }}
                >
                  <i className={`ti ${m.icon}`} style={{ fontSize: 18, display: 'block', marginBottom: 3, color: method === m.id ? 'var(--text)' : 'var(--text2)' }} />
                  <div style={{ fontSize: 10, fontWeight: 500, color: method === m.id ? 'var(--text)' : 'var(--text2)' }}>{m.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="frow">
            <label className="flbl" htmlFor="w-amt">
              {t(lang, 'amount')} (ETB) <span style={{ fontWeight: 400, color: 'var(--text3)' }}>
                {tab === 'deposit' ? t(lang, 'minDeposit') : t(lang, 'minWithdraw')}
              </span>
            </label>
            <input
              type="number"
              id="w-amt"
              placeholder={tab === 'deposit' ? 'e.g. 200' : 'e.g. 100'}
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>

          {/* Quick amounts */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {(tab === 'deposit' ? [50, 100, 200, 500] : [50, 100, 250]).map(a => (
              <button key={a} className="sbtn" style={{ flex: 1, padding: '5px 0', fontSize: 11 }} onClick={() => setAmount(String(a))}>
                {a}
              </button>
            ))}
          </div>

          {toast && <div className={`toast ${toast.cls}`} style={{ marginBottom: 10 }}>{toast.msg}</div>}

          <button className="abtn" style={{ width: '100%', padding: 10 }} onClick={tab === 'deposit' ? doDeposit : doWithdraw}>
            {tab === 'deposit' ? t(lang, 'depositBtn') : t(lang, 'withdrawBtn')}
          </button>
        </div>

        {/* Transaction history */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div className="sec" style={{ margin: 0 }}>{t(lang, 'transactionHistory')}</div>
            <span className="tag tn" style={{ fontSize: 10 }}>{state.transactions.length} records</span>
          </div>
          {state.transactions.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text2)', textAlign: 'center', padding: '20px 0' }}>{t(lang, 'noTransactions')}</div>
          ) : state.transactions.map((tx, i) => (
            <div key={i} className="txr">
              <div className={`txi ${tx.type === 'in' ? 'in-i' : tx.type === 'star' ? 'star-i' : 'out-i'}`}>
                <i className={`ti ${tx.type === 'in' ? 'ti-arrow-down' : tx.type === 'star' ? 'ti-star' : 'ti-arrow-up'}`} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12 }}>{tx.desc}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>{tx.date}</div>
              </div>
              <span className={tx.type === 'in' ? 'amt-p' : tx.type === 'star' ? 'amt-s' : 'amt-n'}>
                {tx.type === 'in' ? '+' : tx.type === 'star' ? '★ +' : ''}{Math.abs(tx.amt).toLocaleString()}
                {tx.type !== 'star' ? ' ETB' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
