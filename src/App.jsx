
import React, { useState } from "react";
import { supabase } from "./supabase";

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);

  async function login(e) {
    e.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) return alert(error.message);
    setUser(data.user);
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  if (!user) return (
    <main className="login">
      <h1>EAGT NYAKIGONGO</h1>
      <h2>MFUMO WA USIMAMIZI WA KANISA</h2>
      <form onSubmit={login}>
        <input type="email" placeholder="Barua pepe"
          value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Nenosiri"
          value={password} onChange={e => setPassword(e.target.value)} required />
        <button>INGIA</button>
      </form>
    </main>
  );

  const tabs = [
    ["dashboard", "Mwanzo"],
    ["members", "Wanachama"],
    ["visitors", "Wageni"],
    ["departments", "Idara"],
    ["attendance", "Mahudhurio"],
    ["reports", "Ripoti"]
  ];

  return (
    <main>
      <header>
        <h1>EAGT NYAKIGONGO</h1>
        <p>MFUMO WA USIMAMIZI WA KANISA</p>
        <button onClick={logout}>Toka</button>
      </header>
      <nav>
        {tabs.map(([id, name]) => (
          <button key={id} onClick={() => setTab(id)}>
            {name}
          </button>
        ))}
      </nav>
      <section>
        <h2>{tabs.find(t => t[0] === tab)?.[1]}</h2>
        {tab === "dashboard" && <p>Karibu katika mfumo wa kanisa.</p>}
        {tab === "members" && <p>Usimamizi wa wanachama.</p>}
        {tab === "visitors" && <p>Usajili wa wageni.</p>}
        {tab === "departments" && <p>Usimamizi wa idara.</p>}
        {tab === "attendance" && <p>Rekodi za mahudhurio.</p>}
        {tab === "reports" && <p>Ripoti za kanisa.</p>}
      </section>
    </main>
  );
}
