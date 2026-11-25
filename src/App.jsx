
import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./App.css";

const today = new Date().toISOString().slice(0, 10);

const pages = [
  ["dashboard", "Mwanzo"],
  ["members", "Washirika"],
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
    title: "Washirika",
    fields: [
      ["full_name", "Jina kamili", "text"],
      ["member_number", "Namba ya mshirika", "text"],
      ["phone", "Simu", "text"],
      ["gender", "Jinsia", "select", ["ME", "KE"]],
      ["date_of_birth", "Tarehe ya kuzaliwa", "date"],
      ["residence", "Makazi", "text"],
      ["marital_status", "Hali ya ndoa", "text"],
      ["church_service", "Huduma kanisani", "text"],
      ["joined_on", "Tarehe ya kujiunga", "date"],
      ["position", "Wadhifa", "text"],
      ["is_active", "Hali ya ushirika", "select", ["true", "false"]]
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
      ["member_id", "Mshirika", "member"],
      ["service_date", "Tarehe ya ibada", "date"],
      ["service_type", "Aina ya ibada", "select", [
        "JUMATANO", "IJUMAA", "MKESHA", "JUMAPILI",
        "IBADA KUU", "MAOMBI", "MAFUNDISHO YA BIBLIA",
        "IBADA NYINGINE"
      ]],
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
    full_name: "",
    member_number: "",
    phone: "",
    gender: "ME",
    date_of_birth: "",
    residence: "",
    marital_status: "",
    church_service: "",
    joined_on: today,
    position: "",
    is_active: "true"
  },
  visitors: {
    full_name: "",
    phone: "",
    residence: "",
    visit_date: today,
    notes: ""
  },
  departments: {
    name: "",
    description: "",
    is_active: "true"
  },
  attendance: {
    member_id: "",
    service_date: today,
    service_type: "JUMAPILI",
    attended: "true"
  },
  events: {
    event_name: "",
    event_date: today,
    description: ""
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
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [printReport, setPrintReport] = useState(null);

  // Taarifa za mahudhurio ya washirika wote
  const [attendanceDate, setAttendanceDate] = useState(today);
  const [attendanceType, setAttendanceType] = useState("JUMAPILI");
  const [attendanceChecks, setAttendanceChecks] = useState({});
  const [attendanceSaving, setAttendanceSaving] = useState(false);

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
      ["members", "created_at"],
      ["visitors", "created_at"],
      ["departments", "created_at"],
      ["attendance", "created_at"],
      ["church_events", "created_at"],
      ["sms_history", "sent_at"]
    ];

    const results = await Promise.all(
      tables.map(([table, orderColumn]) =>
        supabase
          .from(table)
          .select("*")
          .order(orderColumn, { ascending: false })
      )
    );

    const next = {};

    results.forEach((result, index) => {
      const table = tables[index][0];

      if (result.error) {
        console.error(table, result.error.message);
        next[table] = [];
      } else {
        next[table] = result.data || [];
      }
    });

    setRows(next);
    setLoading(false);
  }

  useEffect(() => {
    if (user && profile) loadData();
  }, [user, profile]);

  // Kusoma mahudhurio yaliyokwisha hifadhiwa kwa tarehe na ibada husika
  useEffect(() => {
    if (!Array.isArray(rows.members)) return;

    const checks = {};

    rows.members
      .filter(member => member.is_active)
      .forEach(member => {
        checks[member.id] = false;
      });

    (rows.attendance || [])
      .filter(item =>
        item.service_date === attendanceDate &&
        item.service_type === attendanceType
      )
      .forEach(item => {
        checks[item.member_id] = item.attended === true;
      });

    setAttendanceChecks(checks);
  }, [rows.members, rows.attendance, attendanceDate, attendanceType]);

  async function login(e) {
    e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) alert(error.message);
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRows({});
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

  function updateField(key, value) {
    setDraft(previous => ({
      ...previous,
      [key]: value
    }));
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

    if (tab === "members" && !payload.full_name) {
      return alert("Tafadhali andika jina la mshirika.");
    }

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

    if (!window.confirm("Una uhakika unataka kufuta taarifa hii?")) {
      return;
    }

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

  // Kuhifadhi mahudhurio ya washirika wote kwa mara moja
  async function saveAllAttendance() {
    if (!pastor && !secretary) {
      return alert("Huna ruhusa ya kuhifadhi mahudhurio.");
    }

    const members = (rows.members || []).filter(
      member => member.is_active
    );

    if (!members.length) {
      return alert("Hakuna washirika hai.");
    }

    if (!window.confirm(
      "Unahifadhi mahudhurio ya washirika " +
      members.length + " kwa tarehe " +
      attendanceDate + " — " + attendanceType + "?"
    )) {
      return;
    }

    setAttendanceSaving(true);

    const { data: existing, error: checkError } = await supabase
      .from("attendance")
      .select("id")
      .eq("service_date", attendanceDate)
      .eq("service_type", attendanceType);

    if (checkError) {
      setAttendanceSaving(false);
      return alert("Hitilafu: " + checkError.message);
    }

    if (secretary && !pastor && (existing || []).length > 0) {
      setAttendanceSaving(false);
      return alert(
        "Mahudhurio ya ibada hii tayari yamehifadhiwa. " +
        "Mchungaji ndiye anayeruhusiwa kufanya marekebisho."
      );
    }

    const records = members.map(member => ({
      member_id: member.id,
      service_date: attendanceDate,
      service_type: attendanceType,
      attended: attendanceChecks[member.id] === true
    }));

    let result;

    if (pastor) {
      result = await supabase
        .from("attendance")
        .upsert(records, {
          onConflict: "member_id,service_date,service_type"
        });
    } else {
      result = await supabase
        .from("attendance")
        .insert(records);
    }

    setAttendanceSaving(false);

    if (result.error) {
      return alert("Imeshindwa kuhifadhi mahudhurio: " + result.error.message);
    }

    alert("Mahudhurio yamehifadhiwa kikamilifu.");

    await loadData();
  }

  async function sendSMS(e) {
    e.preventDefault();

    if (!pastor) {
      return alert("Mchungaji pekee ndiye anayeruhusiwa kutuma SMS.");
    }

    const members = (rows.members || []).filter(
      member => member.is_active && member.phone
    );

    if (!members.length) {
      return alert("Hakuna washirika hai wenye namba za simu.");
    }

    if (!window.confirm(
      "Unataka kutuma ujumbe kwa washirika " + members.length + "?"
    )) {
      return;
    }

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

    alert(
      "SMS zilizotumwa: " + sent +
      "\nZilizoshindwa: " + failed
    );

    await loadData();
  }

  function renderField(field) {
    const [key, label, type, options] = field;
    const value = draft[key] ?? "";

    if (type === "textarea") {
      return (
        <label key={key}>
          {label}
          <textarea
            value={value}
            required={key === "event_name" || key === "full_name"}
            onChange={e => updateField(key, e.target.value)}
          />
        </label>
      );
    }

    if (type === "member") {
      return (
        <label key={key}>
          {label}
          <select
            value={value}
            required
            onChange={e => updateField(key, e.target.value)}
          >
            <option value="">Chagua mshirika</option>

            {(rows.members || [])
              .filter(member => member.is_active)
              .map(member => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
          </select>
        </label>
      );
    }

    if (type === "select") {
      return (
        <label key={key}>
          {label}
          <select
            value={value}
            onChange={e => updateField(key, e.target.value)}
          >
            {options.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      );
    }

    return (
      <label key={key}>
        {label}
        <input
          type={type}
          value={value}
          required={[
            "full_name",
            "name",
            "event_name",
            "member_id",
            "service_date",
            "event_date"
          ].includes(key)}
          onChange={e => updateField(key, e.target.value)}
        />
      </label>
    );
  }

  function printNow(report) {
    setPrintReport(report);

    setTimeout(() => {
      window.print();
    }, 500);
  }

  function printMembersPDF() {
    const members = [...(rows.members || [])].sort((a, b) =>
      (a.full_name || "").localeCompare(b.full_name || "")
    );

    const reportRows = members.map((member, index) => [
      index + 1,
      member.member_number || "—",
      member.full_name || "—",
      member.gender || "—",
      member.phone || "—",
      member.residence || "—",
      member.is_active ? "Hai" : "Hajat"
    ]);

    printNow({
      title: "ORODHA YA WASHIRIKA",
      subtitle: "EAGT NYAKIGONGO",
      headers: [
        "Na.",
        "Namba",
        "Jina kamili",
        "Jinsia",
        "Simu",
        "Makazi",
        "Hali"
      ],
      rows: reportRows
    });
  }

  function printIndividualAttendance() {
    const member = (rows.members || []).find(
      item => item.id === selectedMemberId
    );

    if (!member) {
      return alert("Tafadhali chagua mshirika kwanza.");
    }

    const attendance = (rows.attendance || [])
      .filter(item => item.member_id === member.id)
      .sort((a, b) =>
        (b.service_date || "").localeCompare(a.service_date || "")
      );

    if (!attendance.length) {
      return alert("Mshirika huyu hana taarifa za mahudhurio.");
    }

    const attendedCount = attendance.filter(
      item => item.attended === true
    ).length;

    const reportRows = attendance.map((item, index) => [
      index + 1,
      item.service_date || "—",
      item.service_type || "—",
      item.attended ? "Amehudhuria" : "Hakuhudhuria"
    ]);

    printNow({
      title: "TAARIFA BINAFSI YA MAHUDHURIO",
      subtitle:
        "Jina: " + member.full_name +
        " | Namba: " + (member.member_number || "—") +
        " | Amehudhuria: " + attendedCount +
        " | Hakuhudhuria: " + (attendance.length - attendedCount),
      headers: ["Na.", "Tarehe", "Aina ya ibada", "Hali ya mahudhurio"],
      rows: reportRows
    });
  }

  function renderAttendancePage() {
    const members = (rows.members || [])
      .filter(member => member.is_active)
      .sort((a, b) =>
        (a.full_name || "").localeCompare(b.full_name || "")
      );

    const presentCount = members.filter(
      member => attendanceChecks[member.id] === true
    ).length;

    const absentCount = members.length - presentCount;

    return (
      <div className="attendance-page">
        <h2>MAHUDHURIO YA WASHIRIKA</h2>

        <label>
          Tarehe ya ibada
          <input
            type="date"
            value={attendanceDate}
            onChange={e => setAttendanceDate(e.target.value)}
          />
        </label>

        <label>
          Aina ya ibada
          <select
            value={attendanceType}
            onChange={e => setAttendanceType(e.target.value)}
          >
            {[
              "JUMATANO",
              "IJUMAA",
              "MKESHA",
              "JUMAPILI",
              "IBADA KUU",
              "MAOMBI",
              "MAFUNDISHO YA BIBLIA",
              "IBADA NYINGINE"
            ].map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <div className="stats">
          <article>
            Washirika wote
            <strong>{members.length}</strong>
          </article>

          <article>
            Waliohudhuria
            <strong>{presentCount}</strong>
          </article>

          <article>
            Wasiokuwepo
            <strong>{absentCount}</strong>
          </article>
        </div>

        <h3>WEKA TIKI KWA WALIOHUDHURIA</h3>

        <p>
          Weka tiki kwenye kisanduku cha kila mshirika aliyefika ibadani.
          Wasiowekwa tiki watahesabiwa kuwa hawakuhudhuria.
        </p>

        <div className="record-list">
          {members.map((member, index) => (
            <label
              key={member.id}
              className="record attendance-member"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px",
                cursor: "pointer"
              }}
            >
              <input
                type="checkbox"
                checked={attendanceChecks[member.id] === true}
                onChange={e =>
                  setAttendanceChecks(previous => ({
                    ...previous,
                    [member.id]: e.target.checked
                  }))
                }
                style={{
                  width: "24px",
                  height: "24px",
                  flexShrink: 0
                }}
              />

              <span>
                {index + 1}. {member.full_name}
                {member.member_number
                  ? " — " + member.member_number
                  : ""}
              </span>
            </label>
          ))}

          {!members.length && (
            <p>Hakuna washirika hai waliopatikana.</p>
          )}
        </div>

        {(pastor || secretary) && (
          <button
            type="button"
            onClick={saveAllAttendance}
            disabled={attendanceSaving || !members.length}
          >
            {attendanceSaving
              ? "INAHIFADHI..."
              : "HIFADHI MAHUDHURIO YOTE"}
          </button>
        )}
      </div>
    );
  }

  function renderFormPage() {
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

        {tab === "members" && (
          <button type="button" onClick={printMembersPDF}>
            PAKUA PDF YA ORODHA YA WASHIRIKA
          </button>
        )}

        {(pastor || secretary) && !editing && (
          <button type="button" onClick={startNew}>
            + Ongeza taarifa
          </button>
        )}

        {Object.keys(draft).length > 0 && (
          <form onSubmit={saveRecord} className="record-form">
            <h3>{editing ? "Hariri taarifa" : "Taarifa mpya"}</h3>

            {config.fields.map(field => renderField(field))}

            <button disabled={loading}>
              {loading ? "Inahifadhi..." : "HIFADHI"}
            </button>

            <button
              type="button"
              onClick={() => {
                setDraft({});
                setEditing(null);
              }}
            >
              GHAIRI
            </button>
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
                    ? (rows.members || []).find(
                        member => member.id === row[key]
                      )?.full_name || "—"
                    : key === "is_active"
                      ? (row[key] ? "Hai" : "Haujafanya kazi")
                      : key === "attended"
                        ? (row[key] ? "Amehudhuria" : "Hakuhudhuria")
                        : String(row[key] ?? "—")}
                </p>
              ))}

              {pastor && (
                <div className="actions">
                  <button onClick={() => startEdit(row)}>
                    Hariri
                  </button>

                  <button onClick={() => deleteRecord(row.id)}>
                    Futa
                  </button>
                </div>
              )}
            </article>
          ))}

          {!filtered.length && (
            <p>Hakuna taarifa zilizopatikana.</p>
          )}
        </div>
      </>
    );
  }

  function renderDashboard() {
    return (
      <>
        <h2>Muhtasari wa kanisa</h2>

        <div className="stats">
          <article>
            Washirika
            <strong>{(rows.members || []).length}</strong>
          </article>

          <article>
            Wageni
            <strong>{(rows.visitors || []).length}</strong>
          </article>

          <article>
            Idara
            <strong>{(rows.departments || []).length}</strong>
          </article>

          <article>
            Mahudhurio
            <strong>{(rows.attendance || []).length}</strong>
          </article>

          <article>
            Matukio
            <strong>{(rows.church_events || []).length}</strong>
          </article>
        </div>

        <h3>Matukio yajayo</h3>

        {(rows.church_events || [])
          .filter(event => event.event_date >= today)
          .sort((a, b) =>
            a.event_date.localeCompare(b.event_date)
          )
          .map(event => (
            <article className="record" key={event.id}>
              <strong>{event.event_name}</strong>
              <p>{event.event_date}</p>
              <p>{event.description}</p>
            </article>
          ))}
      </>
    );
  }

  function renderSMSPage() {
    return (
      <>
        <h2>Ujumbe wa SMS</h2>

        {pastor ? (
          <form onSubmit={sendSMS}>
            <p>
              Ujumbe utatumwa kwa washirika hai wenye namba za simu.
            </p>

            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Andika ujumbe wako hapa..."
              required
            />

            <button disabled={smsBusy}>
              {smsBusy ? "Inatuma..." : "TUMA SMS KWA WASHIRIKA"}
            </button>
          </form>
        ) : (
          <p>Mchungaji pekee ndiye anayeruhusiwa kutuma SMS.</p>
        )}

        <h3>Historia ya SMS</h3>

        {(rows.sms_history || []).map(sms => (
          <article className="record" key={sms.id}>
            <p>{sms.phone}</p>
            <p>{sms.message}</p>
            <p>{sms.status}</p>
            <small>{sms.sent_at}</small>
          </article>
        ))}
      </>
    );
  }

  function renderReports() {
    const members = rows.members || [];
    const visitors = rows.visitors || [];
    const attendance = rows.attendance || [];
    const events = rows.church_events || [];

    const filteredAttendance = attendance.filter(item =>
      !reportDate || item.service_date === reportDate
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
          <article>
            Washirika
            <strong>{members.length}</strong>
          </article>

          <article>
            Washirika hai
            <strong>{members.filter(m => m.is_active).length}</strong>
          </article>

          <article>
            Wageni
            <strong>{visitors.length}</strong>
          </article>

          <article>
            Mahudhurio
            <strong>
              {filteredAttendance.filter(a => a.attended).length}
            </strong>
          </article>

          <article>
            Matukio
            <strong>{events.length}</strong>
          </article>
        </div>

        <h3>PDF ya mahudhurio ya mshirika mmoja</h3>

        <label>
          Chagua mshirika
          <select
            value={selectedMemberId}
            onChange={e => setSelectedMemberId(e.target.value)}
          >
            <option value="">-- Chagua mshirika --</option>

            {members
              .filter(member => member.is_active)
              .sort((a, b) =>
                (a.full_name || "").localeCompare(b.full_name || "")
              )
              .map(member => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                  {member.member_number
                    ? " - " + member.member_number
                    : ""}
                </option>
              ))}
          </select>
        </label>

        <button
          type="button"
          onClick={printIndividualAttendance}
        >
          PAKUA PDF YA MAHUDHURIO YAKE
        </button>

        <h3>Mahudhurio</h3>

        {filteredAttendance.map(item => (
          <p key={item.id}>
            {(members.find(m => m.id === item.member_id)?.full_name
              || "Mshirika")}
            {" — "}
            {item.service_date}
            {" — "}
            {item.service_type}
            {" — "}
            {item.attended ? "Amehudhuria" : "Hakuhudhuria"}
          </p>
        ))}

        <button
          type="button"
          onClick={() => window.print()}
        >
          CHAPISHA RIPOTI YA JUMLA
        </button>
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

  if (!profile) {
    return <p>Inapakia taarifa za mtumiaji...</p>;
  }

  return (
    <main className="app">
      <style>{`
        .print-area {
          display: none;
        }

        @media print {
          body {
            background: white !important;
            color: black !important;
          }

          body * {
            visibility: hidden !important;
          }

          .print-area,
          .print-area * {
            visibility: visible !important;
          }

          .print-area {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            background: white;
            color: black;
          }

          .print-area h1,
          .print-area h2,
          .print-area p {
            color: black !important;
            text-align: center;
          }

          .print-area table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }

          .print-area th,
          .print-area td {
            border: 1px solid black !important;
            padding: 7px;
            color: black !important;
          }

          .print-area th {
            background: #eee !important;
          }

          @page {
            size: A4 landscape;
            margin: 12mm;
          }
        }
      `}</style>

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
        {tab === "dashboard" && renderDashboard()}

        {tab === "attendance"
          ? renderAttendancePage()
          : configs[tab] && renderFormPage()}

        {tab === "sms" && renderSMSPage()}
        {tab === "reports" && renderReports()}
      </section>

      <footer>
        EAGT NYAKIGONGO © {new Date().getFullYear()}
      </footer>

      {printReport && (
        <div className="print-area">
          <h1>EAGT NYAKIGONGO</h1>
          <h2>{printReport.title}</h2>
          <p>{printReport.subtitle}</p>
          <p>Tarehe ya kutolewa: {today}</p>

          <table>
            <thead>
              <tr>
                {printReport.headers.map((header, index) => (
                  <th key={index}>{header}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {printReport.rows.map((row, index) => (
                <tr key={index}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <p style={{ marginTop: "35px" }}>
            Sahihi ya Mchungaji: __________________________
          </p>
        </div>
      )}
    </main>
  );
}
