import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const API = import.meta.env.VITE_API_URL;

export default function App() {
  const [auth, setAuth] = useState(() => JSON.parse(localStorage.getItem('lancer') || 'null'));
  return auth
    ? <Chat auth={auth} onLogout={() => { localStorage.removeItem('lancer'); setAuth(null); }} />
    : <Login onAuth={(a) => { localStorage.setItem('lancer', JSON.stringify(a)); setAuth(a); }} />;
}

function Login({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API}/api/auth/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    res.ok ? onAuth(data) : setError(data.error);
  };

  return (
    <form onSubmit={submit} style={{ maxWidth: 300, margin: '100px auto', display: 'grid', gap: 8 }}>
      <h2>Lancer</h2>
      <input placeholder="Username" onChange={(e) => setForm({ ...form, username: e.target.value })} />
      <input type="password" placeholder="Password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <button>{mode === 'login' ? 'Log in' : 'Sign up'}</button>
      <a href="#" onClick={(e) => { e.preventDefault(); setMode(mode === 'login' ? 'register' : 'login'); }}>
        {mode === 'login' ? 'Need an account?' : 'Have an account?'}
      </a>
      <small style={{ color: 'red' }}>{error}</small>
    </form>
  );
}

function Chat({ auth, onLogout }) {
  const [users, setUsers] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const socketRef = useRef();
  const activeRef = useRef();
  const headers = { Authorization: `Bearer ${auth.token}` };

  useEffect(() => { activeRef.current = active; }, [active]);

  useEffect(() => {
    fetch(`${API}/api/messages/users`, { headers }).then((r) => r.json()).then(setUsers);
    const socket = io(API, { auth: { token: auth.token } });
    socketRef.current = socket;
    socket.on('private_message', (msg) => {
      const a = activeRef.current;
      if (a && (msg.sender === a._id || msg.receiver === a._id)) setMessages((m) => [...m, msg]);
    });
    return () => socket.disconnect();
  }, []);

  const open = async (u) => {
    setActive(u);
    const res = await fetch(`${API}/api/messages/${u._id}`, { headers });
    setMessages(await res.json());
  };

  const send = (e) => {
    e.preventDefault();
    socketRef.current.emit('private_message', { to: active._id, text });
    setText('');
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <aside style={{ width: 220, borderRight: '1px solid #ccc', padding: 8 }}>
        <b>{auth.user.username}</b> <button onClick={onLogout}>Logout</button>
        {users.map((u) => (
          <div key={u._id} onClick={() => open(u)} style={{ cursor: 'pointer', padding: 6 }}>{u.username}</div>
        ))}
      </aside>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 8 }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {messages.map((m) => (
            <div key={m._id} style={{ textAlign: m.sender === auth.user.id ? 'right' : 'left', margin: 4 }}>
              <span style={{ background: '#eee', padding: '4px 8px', borderRadius: 8 }}>{m.text}</span>
            </div>
          ))}
        </div>
        {active && (
          <form onSubmit={send} style={{ display: 'flex', gap: 4 }}>
            <input style={{ flex: 1 }} value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message ${active.username}`} />
            <button>Send</button>
          </form>
        )}
      </main>
    </div>
  );
}