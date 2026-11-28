
import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./App.css";

// TAREHE YA ENEO LA MTUMIAJI
function getLocalDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const today = getLocalDate();

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

const serviceTypes = [
  "JUMATANO",
  "IJUMAA",
  "MKESHA",
  "JUMAPILI",
  "IBADA KUU",
  "MAOMBI",
  "MAFUNDISHO YA BIBLIA",
  "IBADA NYINGINE"
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

  const [selectedSmsMembers, setSelectedSmsMembers] = useState([]);
  const [smsSearch, setSmsSearch] = useState("");

  const [reportDate, setReportDate] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [printReport, setPrintReport] = useState(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordPanel, setShowPasswordPanel] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);

  const [attendanceDate, setAttendanceDate] = useState(today);
  const [attendanceType, setAttendanceType] = useState("JUMAPILI");
  const [attendanceChecks, setAttendanceChecks] = useState({});
  const [attendanceSaving, setAttendanceSaving] = useState(false);

  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [departmentMemberIds, setDepartmentMemberIds] = useState([]);
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [departmentSaving, setDepartmentSaving] = useState(false);

  const role = profile?.role;
  const pastor = role === "mchungaji";
  const secretary = role === "katibu";

  // KUTHIBITISHA AKAUNTI
  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;

      if (error) {
        console.error("Session error:", error.message);
        return;
      }

      setUser(data.session?.user || null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);

        if (!session) {
          setProfile(null);
          setRows({});
        }
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadProfile(user.id);
    } else {
      setProfile(null);
    }
  }, [user?.id]);

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Profile error:", error.message);
      alert("Imeshindwa kusoma nafasi ya mtumiaji: " + error.message);
      return;
    }

    setProfile(data);
  }

  // KUBADILI PASSWORD
  async function changePassword(e) {
    e.preventDefault();

    if (newPassword.length < 6) {
      alert("Nenosiri jipya liwe na angalau herufi au namba 6.");
      return;
    }

    setPasswordBusy(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    setPasswordBusy(false);

    if (error) {
      alert("Imeshindwa kubadili nenosiri: " + error.message);
      return;
    }

    setNewPassword("");
    setShowNewPassword(false);
    setShowPasswordPanel(false);

    alert("Nenosiri limebadilishwa kikamilifu.");
  }

  // KUSOMA TAARIFA ZA MFUMO
  async function loadData() {
    setLoading(true);

    const tables = [
      ["members", "created_at"],
      ["visitors", "created_at"],
      ["departments", "created_at"],
      ["member_departments", null],
      ["attendance", "created_at"],
      ["church_events", "created_at"],
      ["sms_history", "sent_at"]
    ];

    const results = await Promise.all(
      tables.map(([table, orderColumn]) => {
        let query = supabase.from(table).select("*");

        if (orderColumn) {
          query = query.order(orderColumn, { ascending: false });
        }

        return query;
      })
    );

    const next = {};

    results.forEach((result, index) => {
      const table = tables[index][0];

      if (result.error) {
        console.error("Imeshindwa kusoma " + table, result.error.message);
        next[table] = [];
      } else {
        next[table] = result.data || [];
      }
    });

    setRows(next);
    setLoading(false);
  }

  useEffect(() => {
    if (user && profile) {
      loadData();
    }
  }, [user, profile]);

  // KUJAZA MAHUDHURIO YALIYOPO
  useEffect(() => {
    if (!Array.isArray(rows.members)) return;

    const checks = {};

    rows.members
      .filter(member => member.is_active === true)
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

    if (error) {
      alert("Imeshindwa kuingia: " + error.message);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRows({});
    setShowPasswordPanel(false);
  }

  function startNew() {
    setEditing(null);
    setDraft({ ...empty[tab] });
  }

  function startEdit(row) {
    if (!pastor) {
      alert("Mchungaji pekee ndiye anayeruhusiwa kuhariri taarifa.");
      return;
    }

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

  // KUHIFADHI TAARIFA
  async function saveRecord(e) {
    e.preventDefault();

    if (!pastor && !secretary) {
      alert("Huna ruhusa ya kuhifadhi taarifa.");
      return;
    }

    const config = configs[tab];
    const payload = {};

    config.fields.forEach(([key]) => {
      let value = draft[key];

      if (["is_active"].includes(key)) {
        value = value === true || value === "true";
      }

      if (value === "") value = null;
      payload[key] = value;
    });

    if (
      (tab === "members" || tab === "visitors") &&
      !payload.full_name
    ) {
      alert("Tafadhali andika jina kamili.");
      return;
    }

    if (tab === "departments" && !payload.name) {
      alert("Tafadhali andika jina la idara.");
      return;
    }

    if (tab === "events" && !payload.event_name) {
      alert("Tafadhali andika jina la tukio.");
      return;
    }

    if (editing && !pastor) {
      alert("Mchungaji pekee ndiye anayeruhusiwa kuhariri.");
      return;
    }

    setLoading(true);

    let result;

    if (editing) {
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

    alert("Taarifa imehifadhiwa kikamilifu.");
    setDraft({});
    setEditing(null);
    await loadData();
  }

  // KUZIMA AU KUFUTA TAARIFA
  async function deleteRecord(id) {
    if (!pastor) {
      alert("Mchungaji pekee ndiye anayeruhusiwa kufanya kitendo hiki.");
      return;
    }

    const config = configs[tab];

    // Washirika na idara huzimwa badala ya kufutwa.
    const isDeactivation = tab === "members" || tab === "departments";

    const confirmation = isDeactivation
      ? "Unataka kuzima taarifa hii? Haitatumika kama taarifa hai, lakini historia yake itabaki."
      : "Una uhakika unataka kufuta taarifa hii?";

    if (!window.confirm(confirmation)) return;

    let result;

    if (isDeactivation) {
      result = await supabase
        .from(config.table)
        .update({ is_active: false })
        .eq("id", id);
    } else {
      result = await supabase
        .from(config.table)
        .delete()
        .eq("id", id);
    }

    if (result.error) {
      alert("Imeshindwa kukamilisha kitendo: " + result.error.message);
      return;
    }

    alert(isDeactivation ? "Taarifa imezimwa." : "Taarifa imefutwa.");
    await loadData();
  }

  // IDARA: KUSOMA WASHIRIKA WA IDARA
  async function openDepartmentMembers(department) {
    if (!pastor && !secretary) {
      alert("Huna ruhusa ya kusimamia washirika wa idara.");
      return;
    }

    setLoading(true);
    setDepartmentSearch("");

    const { data, error } = await supabase
      .from("member_departments")
      .select("member_id")
      .eq("department_id", department.id);

    setLoading(false);

    if (error) {
      alert("Imeshindwa kusoma washirika wa idara: " + error.message);
      return;
    }

    setDepartmentMemberIds(
      (data || []).map(item => item.member_id)
    );

    setSelectedDepartment(department);
  }

  function toggleDepartmentMember(memberId) {
    // Katibu haruhusiwi kuondoa mshirika aliyesajiliwa tayari.
    if (
      secretary &&
      !pastor &&
      departmentMemberIds.includes(memberId)
    ) {
      return;
    }

    setDepartmentMemberIds(previous =>
      previous.includes(memberId)
        ? previous.filter(id => id !== memberId)
        : [...previous, memberId]
    );
  }

  function toggleAllDepartmentMembers(members) {
    const allSelected =
      members.length > 0 &&
      members.every(member =>
        departmentMemberIds.includes(member.id)
      );

    if (allSelected) {
      // Katibu hawezi kuondoa waliopo tayari.
      if (secretary && !pastor) return;

      setDepartmentMemberIds(previous =>
        previous.filter(id =>
          !members.some(member => member.id === id)
        )
      );
    } else {
      setDepartmentMemberIds(previous => [
        ...new Set([
          ...previous,
          ...members.map(member => member.id)
        ])
      ]);
    }
  }

  // KUHIFADHI WANACHAMA WA IDARA
  async function saveDepartmentMembers() {
    if (!pastor && !secretary) {
      alert("Huna ruhusa ya kusajili washirika kwenye idara.");
      return;
    }

    if (!selectedDepartment || departmentSaving) return;

    setDepartmentSaving(true);

    const departmentId = selectedDepartment.id;

    const { data: existing, error: readError } = await supabase
      .from("member_departments")
      .select("member_id")
      .eq("department_id", departmentId);

    if (readError) {
      setDepartmentSaving(false);
      alert("Imeshindwa kusoma taarifa za idara: " + readError.message);
      return;
    }

    const oldIds = (existing || []).map(item => item.member_id);

    const toAdd = departmentMemberIds.filter(
      id => !oldIds.includes(id)
    );

    const toRemove = oldIds.filter(
      id => !departmentMemberIds.includes(id)
    );

    // Kuongeza wanachama wapya.
    if (toAdd.length > 0) {
      const records = toAdd.map(memberId => ({
        member_id: memberId,
        department_id: departmentId
      }));

      const { error } = await supabase
        .from("member_departments")
        .insert(records);

      if (error) {
        setDepartmentSaving(false);
        alert("Imeshindwa kusajili washirika wapya: " + error.message);
        return;
      }
    }

    // Kuondoa wanachama: mchungaji pekee.
    if (pastor && toRemove.length > 0) {
      const { error } = await supabase
        .from("member_departments")
        .delete()
        .eq("department_id", departmentId)
        .in("member_id", toRemove);

      if (error) {
        setDepartmentSaving(false);
        await loadData();
        alert("Imeshindwa kuondoa baadhi ya washirika: " + error.message);
        return;
      }
    }

    setDepartmentSaving(false);

    alert(
      "Washirika wa idara " +
      selectedDepartment.name +
      " wamehifadhiwa."
    );

    setSelectedDepartment(null);
    setDepartmentMemberIds([]);
    setDepartmentSearch("");

    await loadData();
  }

  // MAHUDHURIO
  async function saveAllAttendance() {
    if (!pastor && !secretary) {
      alert("Huna ruhusa ya kuhifadhi mahudhurio.");
      return;
    }

    const members = (rows.members || []).filter(
      member => member.is_active === true
    );

    if (!members.length) {
      alert("Hakuna washirika hai.");
      return;
    }

    const confirmed = window.confirm(
      "Unahifadhi mahudhurio ya washirika " +
      members.length +
      " kwa tarehe " +
      attendanceDate +
      " — " +
      attendanceType +
      "?"
    );

    if (!confirmed) return;

    setAttendanceSaving(true);

    const { data: existing, error: checkError } = await supabase
      .from("attendance")
      .select("id")
      .eq("service_date", attendanceDate)
      .eq("service_type", attendanceType);

    if (checkError) {
      setAttendanceSaving(false);
      alert("Hitilafu: " + checkError.message);
      return;
    }

    // Katibu hawezi kuandika upya mahudhurio yaliyopo.
    if (secretary && !pastor && (existing || []).length > 0) {
      setAttendanceSaving(false);
      alert(
        "Mahudhurio ya ibada hii tayari yamehifadhiwa. " +
        "Mchungaji ndiye anayeruhusiwa kufanya marekebisho."
      );
      return;
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
      alert("Imeshindwa kuhifadhi mahudhurio: " + result.error.message);
      return;
    }

    alert("Mahudhurio yamehifadhiwa kikamilifu.");
    await loadData();
  }

  // SMS: WAPOKEAJI WENYE NAMBA ZA SIMU
  function getSmsEligibleMembers() {
    return (rows.members || [])
      .filter(member =>
        member.is_active === true &&
        member.phone &&
        String(member.phone).trim() !== ""
      )
      .sort((a, b) =>
        (a.full_name || "").localeCompare(b.full_name || "")
      );
  }

  function toggleSmsMember(memberId) {
    setSelectedSmsMembers(previous =>
      previous.includes(memberId)
        ? previous.filter(id => id !== memberId)
        : [...previous, memberId]
    );
  }

  function selectAllSmsMembers() {
    const members = getSmsEligibleMembers();
    setSelectedSmsMembers(members.map(member => member.id));
  }

  function clearSmsSelection() {
    setSelectedSmsMembers([]);
  }

  // KUTUMA SMS
  async function sendSMS(e) {
    e.preventDefault();

    if (!pastor) {
      alert("Mchungaji pekee ndiye anayeruhusiwa kutuma SMS.");
      return;
    }

    const cleanMessage = message.trim();

    if (!cleanMessage) {
      alert("Tafadhali andika ujumbe wa SMS.");
      return;
    }

    const members = getSmsEligibleMembers().filter(member =>
      selectedSmsMembers.includes(member.id)
    );

    if (!members.length) {
      alert("Tafadhali chagua angalau mshirika mmoja.");
      return;
    }

    if (!window.confirm(
      "Unataka kutuma SMS kwa washirika " +
      members.length +
      " uliochagua?"
    )) {
      return;
    }

    setSmsBusy(true);

    let sent = 0;
    let failed = 0;
    const failedIds = [];

    for (const member of members) {
      let status = "failed";

      try {
        const { data, error } = await supabase.functions.invoke(
          "send-sms",
          {
            body: {
              phone: member.phone,
              message: cleanMessage
            }
          }
        );

        // Mafanikio yanakubaliwa tu pale API inaposema success: true.
        if (!error && data?.success === true) {
          status = "sent";
          sent++;
        } else {
          failed++;
          failedIds.push(member.id);

          console.error(
            "SMS imeshindwa kwa " + member.phone,
            error || data
          );
        }
      } catch (error) {
        failed++;
        failedIds.push(member.id);
        console.error("Hitilafu ya kutuma SMS:", error);
      }

      const { error: historyError } = await supabase
        .from("sms_history")
        .insert({
          phone: member.phone,
          message: cleanMessage,
          status
        });

      if (historyError) {
        console.error(
          "Imeshindwa kuhifadhi historia ya SMS:",
          historyError
        );
      }
    }

    setSmsBusy(false);

    // Walioshindwa wanabaki wamechaguliwa.
    setSelectedSmsMembers(failedIds);

    if (failed === 0) {
      setMessage("");
    }

    alert(
      "SMS zilizothibitishwa kuwa zimetumwa: " + sent +
      "\nSMS zilizoshindwa au ambazo hazijathibitishwa: " + failed +
      (failed > 0
        ? "\nWalioshindwa wamebaki wamechaguliwa ili ujaribu tena."
        : "\nUjumbe umetumwa kwa wote uliochagua.")
    );

    await loadData();
  }

  // FIELDS ZA FOMU
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
                {option === "true"
                  ? "Hai / Ndiyo"
                  : option === "false"
                    ? "Hapana / Haifanyi kazi"
                    : option}
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
            "event_name"
          ].includes(key)}
          onChange={e => updateField(key, e.target.value)}
        />
      </label>
    );
  }

  // RIPOTI
  function printNow(report) {
    setPrintReport(report);

    setTimeout(() => {
      window.print();
    }, 700);
  }

  function makeSection(title, headers, reportRows) {
    return {
      title,
      headers,
      rows: reportRows
    };
  }

  function getMemberDepartmentReport() {
    const members = rows.members || [];
    const departments = rows.departments || [];
    const links = rows.member_departments || [];
    const reportRows = [];
    let number = 1;

    departments.forEach(department => {
      const assignedIds = links
        .filter(link => link.department_id === department.id)
        .map(link => link.member_id);

      const assignedMembers = members
        .filter(member => assignedIds.includes(member.id))
        .sort((a, b) =>
          (a.full_name || "").localeCompare(b.full_name || "")
        );

      if (assignedMembers.length === 0) {
        reportRows.push([
          department.name,
          "—",
          "Hakuna mshirika aliyesajiliwa",
          "—",
          "—"
        ]);
      } else {
        assignedMembers.forEach(member => {
          reportRows.push([
            department.name,
            number++,
            member.full_name || "—",
            member.member_number || "—",
            member.phone || "—"
          ]);
        });
      }
    });

    const assignedIds = new Set(
      links.map(link => link.member_id)
    );

    const unassigned = members
      .filter(member => !assignedIds.has(member.id))
      .sort((a, b) =>
        (a.full_name || "").localeCompare(b.full_name || "")
      );

    unassigned.forEach(member => {
      reportRows.push([
        "HAJAPANGIWA IDARA",
        number++,
        member.full_name || "—",
        member.member_number || "—",
        member.phone || "—"
      ]);
    });

    return makeSection(
      "ORODHA YA WASHIRIKA KWA IDARA",
      ["Idara", "Na.", "Jina la mshirika", "Namba", "Simu"],
      reportRows
    );
  }

  function getVisitorsReport() {
    const visitors = [...(rows.visitors || [])].sort((a, b) =>
      (b.visit_date || "").localeCompare(a.visit_date || "")
    );

    return makeSection(
      "ORODHA YA WAGENI",
      ["Na.", "Jina kamili", "Simu", "Makazi", "Tarehe", "Maelezo"],
      visitors.map((visitor, index) => [
        index + 1,
        visitor.full_name || "—",
        visitor.phone || "—",
        visitor.residence || "—",
        visitor.visit_date || "—",
        visitor.notes || "—"
      ])
    );
  }

  function getAttendanceReportSections() {
    const attendance = rows.attendance || [];
    const members = rows.members || [];

    const filtered = attendance.filter(item =>
      !reportDate || item.service_date === reportDate
    );

    const sessionsMap = new Map();

    filtered.forEach(item => {
      const key = item.service_date + "|" + item.service_type;

      if (!sessionsMap.has(key)) {
        sessionsMap.set(key, {
          date: item.service_date,
          type: item.service_type,
          present: 0,
          absent: 0,
          total: 0
        });
      }

      const session = sessionsMap.get(key);
      session.total++;

      if (item.attended === true) {
        session.present++;
      } else {
        session.absent++;
      }
    });

    const sessionRows = [...sessionsMap.values()]
      .sort((a, b) =>
        (b.date || "").localeCompare(a.date || "")
      )
      .map((session, index) => [
        index + 1,
        session.date,
        session.type,
        session.total,
        session.present,
        session.absent,
        session.total
          ? Math.round((session.present / session.total) * 100) + "%"
          : "0%"
      ]);

    const sessions = [...new Set(
      attendance
        .filter(item => item.service_date <= today)
        .map(item =>
          item.service_date + "|" + item.service_type
        )
    )];

    const individualRows = [...members]
      .sort((a, b) =>
        (a.full_name || "").localeCompare(b.full_name || "")
      )
      .map((member, index) => {
        const joinedOn = member.joined_on || "0000-00-00";

        const expectedSessions = sessions.filter(key => {
          const date = key.split("|")[0];
          return date >= joinedOn;
        });

        const expectedKeys = new Set(expectedSessions);

        const memberRecords = attendance.filter(item =>
          item.member_id === member.id &&
          expectedKeys.has(
            item.service_date + "|" + item.service_type
          )
        );

        const attendedCount = memberRecords.filter(
          item => item.attended === true
        ).length;

        const expectedCount = expectedSessions.length;

        const percentage = expectedCount
          ? Math.round((attendedCount / expectedCount) * 100)
          : 0;

        return [
          index + 1,
          member.full_name || "—",
          member.member_number || "—",
          attendedCount,
          expectedCount,
          percentage + "%"
        ];
      });

    return [
      makeSection(
        "MUHTASARI WA MAHUDHURIO KWA IBADA",
        [
          "Na.",
          "Tarehe",
          "Aina ya ibada",
          "Walioandikishwa",
          "Waliohudhuria",
          "Hawakuhudhuria",
          "Asilimia"
        ],
        sessionRows
      ),
      makeSection(
        "MUHTASARI WA MAHUDHURIO KWA KILA MSHIRIKA",
        [
          "Na.",
          "Jina",
          "Namba",
          "Amehudhuria",
          "Ibada zilizorekodiwa",
          "Asilimia"
        ],
        individualRows
      )
    ];
  }

  function getEventsReportSections() {
    const events = [...(rows.church_events || [])]
      .sort((a, b) =>
        (a.event_date || "").localeCompare(b.event_date || "")
      );

    const completed = events.filter(
      event => event.event_date < today
    );

    const upcoming = events.filter(
      event => event.event_date >= today
    );

    const convert = list => list.map((event, index) => [
      index + 1,
      event.event_name || "—",
      event.event_date || "—",
      event.description || "—"
    ]);

    return [
      makeSection(
        "MATUKIO YALIYOPITA",
        ["Na.", "Jina la tukio", "Tarehe", "Maelezo"],
        convert(completed)
      ),
      makeSection(
        "MATUKIO YANAYOKUJA",
        ["Na.", "Jina la tukio", "Tarehe", "Maelezo"],
        convert(upcoming)
      )
    ];
  }

  function printMembersPDF() {
    printNow({
      title: "RIPOTI YA WASHIRIKA",
      subtitle: "Washirika waliopangwa kwa idara na ambao hawajapangiwa idara",
      sections: [getMemberDepartmentReport()]
    });
  }

  function printVisitorsPDF() {
    printNow({
      title: "RIPOTI YA WAGENI",
      subtitle: "Orodha ya wageni wa EAGT NYAKIGONGO",
      sections: [getVisitorsReport()]
    });
  }

  function printAttendancePDF() {
    printNow({
      title: "RIPOTI YA MAHUDHURIO",
      subtitle: reportDate
        ? "Mahudhurio ya tarehe " + reportDate + " na muhtasari wa washirika"
        : "Muhtasari wa mahudhurio yote yaliyorekodiwa",
      sections: getAttendanceReportSections()
    });
  }

  function printEventsPDF() {
    printNow({
      title: "RIPOTI YA MATUKIO",
      subtitle: "Matukio yaliyopita na matukio yanayokuja",
      sections: getEventsReportSections()
    });
  }

  function printMasterPDF() {
    if (!pastor) {
      alert("Mchungaji pekee ndiye anayeruhusiwa kutoa ripoti kuu.");
      return;
    }

    printNow({
      title: "RIPOTI KUU YA KANISA",
      subtitle: "Ripoti ya washirika, wageni, mahudhurio na matukio",
      sections: [
        getMemberDepartmentReport(),
        getVisitorsReport(),
        ...getAttendanceReportSections(),
        ...getEventsReportSections()
      ]
    });
  }

  function printIndividualAttendance() {
    const member = (rows.members || []).find(
      item => item.id === selectedMemberId
    );

    if (!member) {
      alert("Tafadhali chagua mshirika kwanza.");
      return;
    }

    const attendance = (rows.attendance || [])
      .filter(item => item.member_id === member.id)
      .sort((a, b) =>
        (b.service_date || "").localeCompare(a.service_date || "")
      );

    const joinedOn = member.joined_on || "0000-00-00";

    const sessions = new Set(
      (rows.attendance || [])
        .filter(item =>
          item.service_date >= joinedOn &&
          item.service_date <= today
        )
        .map(item =>
          item.service_date + "|" + item.service_type
        )
    );

    const attendedCount = attendance.filter(
      item => item.attended === true
    ).length;

    const expectedCount = sessions.size;

    const percentage = expectedCount
      ? Math.round((attendedCount / expectedCount) * 100)
      : 0;

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
        " kati ya ibada " + expectedCount +
        " | Asilimia: " + percentage + "%",
      sections: [
        makeSection(
          "MAHUDHURIO YA MSHIRIKA",
          ["Na.", "Tarehe", "Aina ya ibada", "Hali"],
          reportRows
        )
      ]
    });
  }

  // UKURASA WA MAHUDHURIO
  function renderAttendancePage() {
    const members = (rows.members || [])
      .filter(member => member.is_active === true)
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
            {serviceTypes.map(type => (
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
                onChange={e => setAttendanceChecks(previous => ({
                  ...previous,
                  [member.id]: e.target.checked
                }))}
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

  // UKURASA WA FOMU ZA TAARIFA
  function renderFormPage() {
    const config = configs[tab];
    const data = rows[config.table] || [];

    // USIMAMIZI WA WASHIRIKA WA IDARA
    if (tab === "departments" && selectedDepartment) {
      const members = (rows.members || [])
        .filter(member =>
          member.is_active === true &&
          (member.full_name || "")
            .toLowerCase()
            .includes(departmentSearch.toLowerCase())
        )
        .sort((a, b) =>
          (a.full_name || "").localeCompare(b.full_name || "")
        );

      return (
        <div>
          <button
            type="button"
            onClick={() => {
              setSelectedDepartment(null);
              setDepartmentMemberIds([]);
              setDepartmentSearch("");
            }}
          >
            ← RUDI KWENYE IDARA
          </button>

          <h2>{selectedDepartment.name}</h2>
          <h3>SAJILI WASHIRIKA KWENYE IDARA HII</h3>

          <p>
            Chagua washirika unaotaka wawe wanachama wa idara hii.
            {secretary && !pastor
              ? " Katibu anaweza kuongeza washirika wapya tu."
              : " Mchungaji anaweza kuongeza au kuondoa washirika."}
          </p>

          <div className="stats">
            <article>
              Washirika waliochaguliwa
              <strong>{departmentMemberIds.length}</strong>
            </article>

            <article>
              Washirika wanaoonekana
              <strong>{members.length}</strong>
            </article>
          </div>

          <input
            type="text"
            placeholder="Tafuta mshirika kwa jina..."
            value={departmentSearch}
            onChange={e => setDepartmentSearch(e.target.value)}
          />

          <label
            className="record"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px",
              cursor: pastor ? "pointer" : "default"
            }}
          >
            <input
              type="checkbox"
              checked={
                members.length > 0 &&
                members.every(member =>
                  departmentMemberIds.includes(member.id)
                )
              }
              onChange={() => toggleAllDepartmentMembers(members)}
              disabled={secretary && !pastor}
            />

            <strong>CHAGUA WOTE WALIOONYESHWA</strong>
          </label>

          <div className="record-list">
            {members.map((member, index) => {
              const alreadyAssigned =
                departmentMemberIds.includes(member.id);

              return (
                <label
                  key={member.id}
                  className="record"
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
                    checked={alreadyAssigned}
                    onChange={() => toggleDepartmentMember(member.id)}
                    disabled={
                      secretary && !pastor && alreadyAssigned
                    }
                    style={{
                      width: "22px",
                      height: "22px",
                      flexShrink: 0
                    }}
                  />

                  <span>
                    {index + 1}. {member.full_name}
                    {member.member_number
                      ? " — " + member.member_number
                      : ""}
                    {alreadyAssigned && secretary && !pastor
                      ? " (Tayari yupo)"
                      : ""}
                  </span>
                </label>
              );
            })}

            {!members.length && (
              <p>Hakuna washirika hai waliopatikana.</p>
            )}
          </div>

          <button
            type="button"
            onClick={saveDepartmentMembers}
            disabled={departmentSaving}
          >
            {departmentSaving
              ? "INAHIFADHI..."
              : "HIFADHI WASHIRIKA WALIOCHAGULIWA"}
          </button>
        </div>
      );
    }

    const filtered = data.filter(row =>
      JSON.stringify(row)
        .toLowerCase()
        .includes(search.toLowerCase())
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
              {tab === "departments" ? (
                <>
                  <h3>{row.name}</h3>
                  <p>{row.description || "Hakuna maelezo."}</p>
                  <p>
                    Hali: {row.is_active ? "Hai" : "Haifanyi kazi"}
                  </p>

                  {(pastor || secretary) && (
                    <button
                      type="button"
                      onClick={() => openDepartmentMembers(row)}
                    >
                      FUNGUA NA SAJILI WASHIRIKA
                    </button>
                  )}

                  <p>
                    Washirika waliosajiliwa:{" "}
                    {(rows.member_departments || []).filter(
                      item => item.department_id === row.id
                    ).length}
                  </p>
                </>
              ) : (
                config.fields.map(([key, label]) => (
                  <p key={key}>
                    <strong>{label}:</strong>{" "}
                    {key === "is_active"
                      ? (row[key] ? "Hai" : "Haifanyi kazi")
                      : String(row[key] ?? "—")}
                  </p>
                ))
              )}

              {pastor && (
                <div className="actions">
                  <button
                    type="button"
                    onClick={() => startEdit(row)}
                  >
                    Hariri
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteRecord(row.id)}
                  >
                    {tab === "members" || tab === "departments"
                      ? "Zima"
                      : "Futa"}
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

  // DASHBOARD
  function renderDashboard() {
    const events = (rows.church_events || [])
      .filter(event => event.event_date >= today)
      .sort((a, b) =>
        a.event_date.localeCompare(b.event_date)
      );

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

        {events.map(event => (
          <article className="record" key={event.id}>
            <strong>{event.event_name}</strong>
            <p>{event.event_date}</p>
            <p>{event.description}</p>
          </article>
        ))}

        {!events.length && <p>Hakuna matukio yajayo yaliyosajiliwa.</p>}
      </>
    );
  }

  // UKURASA WA SMS
  function renderSMSPage() {
    const eligibleMembers = getSmsEligibleMembers();

    const visibleMembers = eligibleMembers.filter(member => {
      const name = (member.full_name || "").toLowerCase();
      const phone = String(member.phone || "");
      const term = smsSearch.trim().toLowerCase();

      return name.includes(term) || phone.includes(term);
    });

    const selectedCount = eligibleMembers.filter(member =>
      selectedSmsMembers.includes(member.id)
    ).length;

    const allSelected =
      eligibleMembers.length > 0 &&
      selectedCount === eligibleMembers.length;

    return (
      <>
        <h2>Ujumbe wa SMS</h2>

        {pastor ? (
          <form onSubmit={sendSMS}>
            <h3>1. CHAGUA WAPOKEAJI</h3>

            <div className="stats">
              <article>
                Washirika wenye simu
                <strong>{eligibleMembers.length}</strong>
              </article>

              <article>
                Waliochaguliwa
                <strong>{selectedCount}</strong>
              </article>
            </div>

            <p>
              Weka tiki kwa mshirika mmoja au zaidi. Unaweza pia
              kuchagua washirika wote.
            </p>

            <input
              type="text"
              value={smsSearch}
              onChange={e => setSmsSearch(e.target.value)}
              placeholder="Tafuta kwa jina au namba ya simu..."
            />

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                margin: "12px 0"
              }}
            >
              <button
                type="button"
                onClick={selectAllSmsMembers}
                disabled={smsBusy || eligibleMembers.length === 0}
              >
                CHAGUA WOTE
              </button>

              <button
                type="button"
                onClick={clearSmsSelection}
                disabled={smsBusy || selectedCount === 0}
              >
                ONDOA UCHAGUZI
              </button>
            </div>

            <label
              className="record"
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
                checked={allSelected}
                onChange={() => {
                  if (allSelected) {
                    clearSmsSelection();
                  } else {
                    selectAllSmsMembers();
                  }
                }}
                disabled={smsBusy || eligibleMembers.length === 0}
                style={{
                  width: "22px",
                  height: "22px",
                  flexShrink: 0
                }}
              />

              <strong>CHAGUA WASHIRIKA WOTE</strong>
            </label>

            <div className="record-list">
              {visibleMembers.map((member, index) => (
                <label
                  key={member.id}
                  className="record"
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
                    checked={selectedSmsMembers.includes(member.id)}
                    onChange={() => toggleSmsMember(member.id)}
                    disabled={smsBusy}
                    style={{
                      width: "23px",
                      height: "23px",
                      flexShrink: 0
                    }}
                  />

                  <span>
                    <strong>
                      {index + 1}. {member.full_name || "Bila jina"}
                    </strong>
                    <br />
                    <small>{member.phone}</small>
                  </span>
                </label>
              ))}

              {!visibleMembers.length && (
                <p>Hakuna mshirika aliyepatikana kwa utafutaji huo.</p>
              )}
            </div>

            <h3>2. ANDIKA UJUMBE</h3>

            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Andika ujumbe wako hapa..."
              required
              rows={5}
              disabled={smsBusy}
              style={{
                width: "100%",
                boxSizing: "border-box",
                minHeight: "120px"
              }}
            />

            <p>
              SMS zitatumwa kwa washirika
              <strong> {selectedCount} </strong>
              uliochagua.
            </p>

            <button
              type="submit"
              disabled={
                smsBusy ||
                selectedCount === 0 ||
                !message.trim()
              }
              style={{
                width: "100%",
                minHeight: "50px",
                fontSize: "16px"
              }}
            >
              {smsBusy
                ? "INATUMA SMS, SUBIRI..."
                : "TUMA SMS KWA WACHAGULIWA (" + selectedCount + ")"}
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
            <p>
              Hali: {sms.status === "sent"
                ? "Imethibitishwa kuwa imetumwa"
                : "Imeshindwa / Haijathibitishwa"}
            </p>
            <small>{sms.sent_at}</small>
          </article>
        ))}
      </>
    );
  }

  // RIPOTI
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
        <h2>RIPOTI ZA KANISA</h2>

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
            Waliohudhuria
            <strong>
              {filteredAttendance.filter(a => a.attended === true).length}
            </strong>
          </article>

          <article>
            Matukio
            <strong>{events.length}</strong>
          </article>
        </div>

        <h3>RIPOTI ZA PDF</h3>
        <p>Chagua ripoti unayotaka kuitoa kama PDF.</p>

        <button type="button" onClick={printMembersPDF}>
          PDF 1: WASHIRIKA KWA IDARA
        </button>

        <button type="button" onClick={printVisitorsPDF}>
          PDF 2: ORODHA YA WAGENI
        </button>

        <label>
          Chagua tarehe ya mahudhurio (acha wazi kwa ripoti yote)
          <input
            type="date"
            value={reportDate}
            onChange={e => setReportDate(e.target.value)}
          />
        </label>

        <button type="button" onClick={printAttendancePDF}>
          PDF 3: RIPOTI YA MAHUDHURIO
        </button>

        <button type="button" onClick={printEventsPDF}>
          PDF 4: RIPOTI YA MATUKIO
        </button>

        {pastor && (
          <>
            <h3>RIPOTI KUU YA MCHUNGAJI</h3>
            <p>
              Ripoti hii ina washirika, wageni, mahudhurio na matukio.
            </p>

            <button type="button" onClick={printMasterPDF}>
              PAKUA PDF KUU YA KANISA
            </button>
          </>
        )}

        <hr />

        <h3>PDF YA MAHUDHURIO YA MSHIRIKA MMOJA</h3>

        <label>
          Chagua mshirika
          <select
            value={selectedMemberId}
            onChange={e => setSelectedMemberId(e.target.value)}
          >
            <option value="">-- Chagua mshirika --</option>

            {members
              .filter(member => member.is_active === true)
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

        <h3>Muhtasari wa mahudhurio</h3>

        {filteredAttendance.map(item => (
          <p key={item.id}>
            {(members.find(m => m.id === item.member_id)?.full_name || "Mshirika")}
            {" — "}
            {item.service_date}
            {" — "}
            {item.service_type}
            {" — "}
            {item.attended ? "Amehudhuria" : "Hakuhudhuria"}
          </p>
        ))}
      </div>
    );
  }

  // UKURASA WA KUINGIA
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
            style={{
              display: "block",
              width: "100%",
              minHeight: "55px",
              boxSizing: "border-box",
              fontSize: "18px",
              padding: "12px",
              marginBottom: "15px"
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              gap: "10px",
              width: "100%"
            }}
          >
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Andika nenosiri hapa"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{
                display: "block",
                width: "100%",
                minWidth: "100%",
                minHeight: "58px",
                boxSizing: "border-box",
                fontSize: "18px",
                padding: "14px",
                margin: "0"
              }}
            />

            <button
              type="button"
              onClick={() => setShowPassword(value => !value)}
              style={{
                width: "100%",
                minHeight: "48px",
                fontSize: "16px"
              }}
            >
              {showPassword ? "FICHA PASSWORD" : "ONYESHA PASSWORD"}
            </button>
          </div>

          <button
            type="submit"
            style={{
              width: "100%",
              minHeight: "52px",
              fontSize: "18px",
              marginTop: "15px"
            }}
          >
            INGIA
          </button>
        </form>
      </main>
    );
  }

  if (!profile) {
    return <p>Inapakia taarifa za mtumiaji...</p>;
  }

  // MWONEKANO MKUU
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
          .print-area h3,
          .print-area p {
            color: black !important;
            text-align: center;
          }

          .print-section {
            page-break-inside: auto;
            margin-bottom: 28px;
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
            text-align: left;
          }

          .print-area th {
            background: #eee !important;
          }

          .print-signature {
            margin-top: 35px;
            text-align: left !important;
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

        <button
          type="button"
          onClick={() => {
            setShowPasswordPanel(value => !value);
            setNewPassword("");
            setShowNewPassword(false);
          }}
        >
          {showPasswordPanel
            ? "FUNGA BADILI PASSWORD"
            : "BADILI PASSWORD"}
        </button>

        <button type="button" onClick={logout}>
          TOKA
        </button>
      </header>

      {showPasswordPanel && (
        <section className="record-form">
          <h2>BADILI PASSWORD</h2>

          <p>
            Weka nenosiri jipya la akaunti yako. Nenosiri lazima liwe
            na angalau herufi au namba 6.
          </p>

          <form onSubmit={changePassword}>
            <label>
              Nenosiri jipya
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                minLength={6}
                required
                autoComplete="new-password"
                placeholder="Andika nenosiri jipya"
                style={{
                  display: "block",
                  width: "100%",
                  minHeight: "55px",
                  boxSizing: "border-box",
                  fontSize: "18px",
                  padding: "12px"
                }}
              />
            </label>

            <button
              type="button"
              onClick={() =>
                setShowNewPassword(value => !value)
              }
            >
              {showNewPassword
                ? "FICHA PASSWORD"
                : "ONYESHA PASSWORD"}
            </button>

            <button type="submit" disabled={passwordBusy}>
              {passwordBusy
                ? "INABADILI..."
                : "HIFADHI PASSWORD MPYA"}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowPasswordPanel(false);
                setNewPassword("");
                setShowNewPassword(false);
              }}
              disabled={passwordBusy}
            >
              GHAIRI
            </button>
          </form>
        </section>
      )}

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
              setSelectedDepartment(null);
              setDepartmentMemberIds([]);
              setDepartmentSearch("");
            }}
          >
            {name}
          </button>
        ))}
      </nav>

      <section>
        {tab === "dashboard" && renderDashboard()}

        {tab === "attendance" && renderAttendancePage()}

        {configs[tab] && renderFormPage()}

        {tab === "sms" && renderSMSPage()}

        {tab === "reports" && renderReports()}

        {loading && <p>Inapakia taarifa...</p>}
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

          {(printReport.sections || []).map((section, sectionIndex) => (
            <div className="print-section" key={sectionIndex}>
              <h3>{section.title}</h3>

              <table>
                <thead>
                  <tr>
                    {section.headers.map((header, index) => (
                      <th key={index}>{header}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {section.rows.length > 0 ? (
                    section.rows.map((row, index) => (
                      <tr key={index}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex}>{cell}</td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={section.headers.length}>
                        Hakuna taarifa zilizopatikana.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ))}

          <p className="print-signature">
            Sahihi ya Mchungaji: __________________________
          </p>
        </div>
      )}
    </main>
  );
}
