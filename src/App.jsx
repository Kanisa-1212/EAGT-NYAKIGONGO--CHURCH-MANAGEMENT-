
import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./App.css";

const today = new Date().toISOString().slice(0, 10);

const pages = [
  ["dashboard", "Mwanzo"],
  ["members", "Wanachama"],
  ["visitors", "Wageni"],
  ["departments", "Idara"],
  ["attendance", "Mahudhurio"],
  ["events", "Matukio"],
  ["sms", "SMS"],
  ["reports", "Ripoti"]
];

const configs = {
  members: {
    table: "members",
    title: "Wanachama",
    fields: [
      ["full_name", "Jina kamili", "text"],
      ["member_number", "Namba ya mwanachama", "text"],
      ["phone", "Simu", "text"],
      ["gender", "Jinsia", "select", ["ME", "KE"]],
      ["date_of_birth", "Tarehe ya kuzaliwa", "date"],
      ["residence", "Makazi", "text"],
      ["marital_status", "Hali ya ndoa", "text"],
      ["church_service", "Huduma kanisani", "text"],
      ["joined_on", "Tarehe ya kujiunga", "date"],
      ["position", "Wadhifa", "text"],
      ["is_active", "Hali ya uanachama", "select", ["true", "false"]]
    ]
  },
  visitors: {
    table: "visitors",
    title: "Wageni",
    fields: [
      ["full_name", "Jina kamili", "text"],
      ["phone", "Simu", "text"],
      ["residence", "Makazi", "text"],
      ["visit_date", "Tarehe ya kutembelea", "date"],
      ["notes", "Maelezo", "textarea"]
    ]
  },
  departments: {
    table: "departments",
    title: "Idara",
    fields: [
      ["name", "Jina la idara", "text"],
      ["description", "Maelezo", "textarea"],
      ["is_active", "Hali ya idara", "select", ["true", "false"]]
    ]
  },
  attendance: {
    table: "attendance",
    title: "Mahudhurio",
    fields: [
      ["member_id", "Mwanachama", "member"],
      ["service_date", "Tarehe ya ibada", "date"],
      ["service_type", "Aina ya ibada", "select",
        ["JUMATANO", "IJUMAA", "MKESHA", "JUMAPILI",
         "IBADA KUU", "MAOMBI", "MAFUNDISHO YA BIBLIA",
         "IBADA NYINGINE"]],
      ["attended", "Amehudhuria", "select", ["true", "false"]]
    ]
  },
  events: {
    table: "church_events",
    title: "Matukio",
    fields: [
      ["event_name", "Jina la tukio", "text"],
      ["event_date", "Tarehe ya tukio", "date"],
      ["description", "Maelezo ya tukio", "textarea"]
    ]
  }
};

const empty = {
  members: {
    full_name: "", member_number: "", phone: "",
    gender: "ME", date_of_birth: "", residence: "",
    marital_status: "", church_service: "", joined_on: today,
    position: "", is_active: "true"
  },
  visitors: {
    full_name: "", phone: "", residence: "",
    visit_date: today, notes: ""
  },
  departments: {
    name: "", description: "", is_active: "true"
  },
  attendance: {
    member_id: "", service_date: today,
    service_type: "JUMAPILI", attended: "true"
  },
  events: {
    event_name: "", event_date: today, description: ""
  }
};

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [rows, setRows] = useState({});
  const [draft, setDraft] = useState({});
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [smsBusy, setSmsBusy] = useState(false);
  const [reportDate, setReportDate] = useState("");

  const role = profile?.role;
  const pastor = role === "mchungaji";
  const secretary = role === "katibu";

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) setUser(data.session?.user || null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
        if (!session) setProfile(null);
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  async function loadProfile() {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      alert("Imeshindwa kusoma nafasi ya mtumiaji: " + error.message);
      return;
    }

    setProfile(data);
  }

  async function loadData() {
    setLoading(true);

    const tables = [
      "members", "visitors", "departments",
      "attendance", "church_events", "sms_history"
    ];

    const results = await Promise.all(
      tables.map(table =>
        supabase.from(table).select("*").order("created_at", {
          ascending: false
        })
      )
    );

    const next = {};

    results.forEach((result, index) => {
      if (result.error) {
        console.error(tables[index], result.error.message);
      } else {
        next[tables[index]] = result.data || [];
      }
    });

    setRows(next);
    setLoading(false);
  }

  useEffect(() => {
    if (user && profile) loadData();
  }, [user, profile]);

  async function login(e) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({
      email, password
    });

    if (error) alert(error.message);
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  function startNew() {
    setEditing(null);
    setDraft({ ...empty[tab] });
  }

  function startEdit(row) {
    setEditing(row.id);
    const values = {};
    configs[tab].fields.forEach(([key]) => {
      values[key] = row[key] ?? "";
    });
    setDraft(values);
  }

  async function saveRecord(e) {
    e.preventDefault();

    if (!pastor && !secretary) {
      return alert("Huna ruhusa ya kuhifadhi taarifa.");
    }

    const config = configs[tab];
    const payload = {};

    config.fields.forEach(([key]) => {
      let value = draft[key];

      if (["is_active", "attended"].includes(key)) {
        value = value === true || value === "true";
      }

      if (value === "") value = null;
      payload[key] = value;
    });

    setLoading(true);

    let result;

    if (editing) {
      if (!pastor) {
        setLoading(false);
        return alert("Mchungaji pekee ndiye anayeruhusiwa kuhariri.");
      }

      result = await supabase
        .from(config.table)
        .update(payload)
        .eq("id", editing);
    } else {
      result = await supabase
        .from(config.table)
        .insert(payload);
    }

    setLoading(false);

    if (result.error) {
      alert("Hitilafu: " + result.error.message);
      return;
    }

    alert("Taarifa imehifadhiwa.");
    setDraft({});
    setEditing(null);
    await loadData();
  }

  async function deleteRecord(id) {
    if (!pastor) {
      return alert("Mchungaji pekee ndiye anayeruhusiwa kufuta.");
    }

    if (!window.confirm("Una uhakika unataka kufuta taarifa hii?")) return;

    const config = configs[tab];

    const { error } = await supabase
      .from(config.table)
      .delete()
      .eq("id", id);

    if (error) {
      alert("Imeshindwa kufuta: " + error.message);
      return;
    }

    alert("Taarifa imefutwa.");
    await loadData();
  }

  async function sendSMS(e) {
    e.preventDefault();

    if (!pastor) return alert("Mchungaji pekee ndiye anayeruhusiwa kutuma SMS.");

    const members = (rows.members || []).filter(
      m => m.is_active && m.phone
    );

    if (!members.length) return alert("Hakuna wanachama wenye namba za simu.");

    if (!window.confirm(
      "Unataka kutuma ujumbe kwa wanachama " + members.length + "?"
    )) return;

    setSmsBusy(true);
    let sent = 0;
    let failed = 0;

    for (const member of members) {
      const { error } = await supabase.functions.invoke("send-sms", {
        body: {
          phone: member.phone,
          message
        }
      });

      if (error) {
        failed++;
        continue;
      }

      const saved = await supabase.from("sms_history").insert({
        phone: member.phone,
        message,
        status: "sent"
      });

      if (saved.error) {
        failed++;
      } else {
        sent++;
      }
    }

    setSmsBusy(false);
    setMessage("");
    alert("SMS zilizotumwa: " + sent + "\nZilizoshindwa: " + failed);
    await loadData();
  }

  function Field({ field }) {
    const [key, label, type, options] = field;
    const value = draft[key] ?? "";

    if (type === "textarea") {
      return (
        <label>
          {label}
          <textarea
            value={value}
            required={key === "event_name" || key === "full_name"}
            onChange={e => setDraft({
              ...draft, [key]: e.target.value
            })}
          />
        </label>
      );
    }

    if (type === "member") {
      return (
        <label>
          {label}
          <select
            value={value}
            required
            onChange={e => setDraft({
              ...draft, [key]: e.target.value
            })}
          >
            <option value="">Chagua mwanachama</option>
            {(rows.members || []).filter(m => m.is_active).map(m => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </select>
        </label>
      );
    }

    if (type === "select") {
      return (
        <label>
          {label}
          <select
            value={value}
            onChange={e => setDraft({
              ...draft, [key]: e.target.value
            })}
          >
            {options.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      );
    }

    return (
      <label>
        {label}
        <input
          type={type}
          value={value}
          required={["full_name", "name", "event_name",
            "member_id", "service_date", "event_date"].includes(key)}
          onChange={e => setDraft({
            ...draft, [key]: e.target.value
          })}
        />
      </label>
    );
  }

  function FormPage() {
    const config = configs[tab];
    const data = rows[config.table] || [];

    const filtered = data.filter(row =>
      JSON.stringify(row).toLowerCase().includes(search.toLowerCase())
    );

    return (
      <>
        <h2>{config.title}</h2>

        <input
          placeholder="Tafuta taarifa..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {(pastor || secretary) && !editing && (
          <button onClick={startNew}>+ Ongeza taarifa</button>
        )}

        {draft && Object.keys(draft).length > 0 && (
          <form onSubmit={saveRecord} className="record-form">
            <h3>{editing ? "Hariri taarifa" : "Taarifa mpya"}</h3>
            {config.fields.map(field => (
              <Field key={field[0]} field={field} />
            ))}
            <button disabled={loading}>HIFADHI</button>
            <button type="button" onClick={() => {
              setDraft({});
              setEditing(null);
            }}>GHAIRI</button>
          </form>
        )}

        {loading && <p>Inapakia...</p>}

        <div className="record-list">
          {filtered.map(row => (
            <article className="record" key={row.id}>
              {config.fields.map(([key, label]) => (
                <p key={key}>
                  <strong>{label}:</strong>{" "}
                  {key === "member_id"
                    ? (rows.members || []).find(m => m.id === row[key])?.full_name || "—"
                    : String(row[key] ?? "—")}
                </p>
              ))}

              {pastor && (
                <div className="actions">
                  <button onClick={() => startEdit(row)}>Hariri</button>
                  <button onClick={() => deleteRecord(row.id)}>Futa</button>
                </div>
              )}
            </article>
          ))}
          {!filtered.length && <p>Hakuna taarifa zilizopatikana.</p>}
        </div>
      </>
    );
  }

  function Dashboard() {
    return (
      <>
        <h2>Muhtasari wa kanisa</h2>
        <div className="stats">
          <article>Wanachama<strong>{(rows.members || []).length}</strong></article>
          <article>Wageni<strong>{(rows.visitors || []).length}</strong></article>
          <article>Idara<strong>{(rows.departments || []).length}</strong></article>
          <article>Mahudhurio<strong>{(rows.attendance || []).length}</strong></article>
          <article>Matukio<strong>{(rows.church_events || []).length}</strong></article>
        </div>
        <h3>Matukio yajayo</h3>
        {(rows.church_events || [])
          .filter(e => e.event_date >= today)
          .sort((a, b) => a.event_date.localeCompare(b.event_date))
          .map(e => (
            <article className="record" key={e.id}>
              <strong>{e.event_name}</strong>
              <p>{e.event_date}</p>
              <p>{e.description}</p>
            </article>
          ))}
      </>
    );
  }

  function SMSPage() {
    return (
      <>
        <h2>Ujumbe wa SMS</h2>

        {pastor ? (
          <form onSubmit={sendSMS}>
            <p>Ujumbe utatumwa kwa wanachama hai wenye namba za simu.</p>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Andika ujumbe wako hapa..."
              required
            />
            <button disabled={smsBusy}>
              {smsBusy ? "Inatuma..." : "TUMA SMS KWA WANACHAMA"}
            </button>
          </form>
        ) : (
          <p>Ni Mchungaji pekee anayeruhusiwa kutuma SMS.</p>
        )}

        <h3>Historia ya SMS</h3>
        {(rows.sms_history || []).map(s => (
          <article className="record" key={s.id}>
            <p>{s.phone}</p>
            <p>{s.message}</p>
            <p>{s.status}</p>
            <small>{s.sent_at}</small>
          </article>
        ))}
      </>
    );
  }

  function Reports() {
    const members = rows.members || [];
    const visitors = rows.visitors || [];
    const attendance = rows.attendance || [];
    const events = rows.church_events || [];

    const filteredAttendance = attendance.filter(a =>
      !reportDate || a.service_date === reportDate
    );

    return (
      <div className="reports">
        <h2>Ripoti za kanisa</h2>
        <label>
          Chagua tarehe ya mahudhurio
          <input
            type="date"
            value={reportDate}
            onChange={e => setReportDate(e.target.value)}
          />
        </label>

        <div className="stats">
          <article>Wanachama<strong>{members.length}</strong></article>
          <article>Wanachama hai<strong>{members.filter(m => m.is_active).length}</strong></article>
          <article>Wageni<strong>{visitors.length}</strong></article>
          <article>Mahudhurio<strong>{filteredAttendance.filter(a => a.attended).length}</strong></article>
          <article>Matukio<strong>{events.length}</strong></article>
        </div>

        <h3>Mahudhurio</h3>
        {filteredAttendance.map(a => (
          <p key={a.id}>
            {(members.find(m => m.id === a.member_id)?.full_name || "Mwanachama")}
            {" — "}{a.service_date} — {a.service_type}
            {" — "}{a.attended ? "Amehudhuria" : "Hakuhudhuria"}
          </p>
        ))}

        <button onClick={() => window.print()}>CHAPISHA RIPOTI</button>
      </div>
    );
  }

  if (!user) {
    return (
      <main className="login">
        <h1>EAGT NYAKIGONGO</h1>
        <h2>MFUMO WA USIMAMIZI WA KANISA</h2>
        <form onSubmit={login}>
          <input
            type="email"
            placeholder="Barua pepe"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Nenosiri"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button>INGIA</button>
        </form>
      </main>
    );
  }

  if (!profile) return <p>Inapakia taarifa za mtumiaji...</p>;

  return (
    <main className="app">
      <header>
        <h1>EAGT NYAKIGONGO</h1>
        <p>MFUMO WA USIMAMIZI WA KANISA</p>
        <p>{profile.full_name} — {profile.role}</p>
        <button onClick={logout}>TOKA</button>
      </header>

      <nav>
        {pages.map(([id, name]) => (
          <button
            key={id}
            className={tab === id ? "selected" : ""}
            onClick={() => {
              setTab(id);
              setDraft({});
              setEditing(null);
              setSearch("");
            }}
          >
            {name}
          </button>
        ))}
      </nav>

      <section>
        {tab === "dashboard" && <Dashboard />}
        {configs[tab] && <FormPage />}
        {tab === "sms" && <SMSPage />}
        {tab === "reports" && <Reports />}
      </section>

      <footer>
        EAGT NYAKIGONGO © {new Date().getFullYear()}
      </footer>
    </main>
  );
}
