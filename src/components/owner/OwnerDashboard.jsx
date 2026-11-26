import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Link } from "../../motion";
import { supabase } from "../../lib/supabaseClient";
import "./dashboard.css";

function display(value) {
  if (value == null || value === "") return "No record";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "string" && /^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value))) {
    return new Date(value).toISOString().slice(0, 19).replace("T", " ") + " UTC";
  }
  return String(value);
}

async function request(body, actor, signal) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || session.user.id !== actor) throw new Error("Please sign in again.");
  const res = await fetch("/api/me?owner=1", {
    method: "POST", cache: "no-store", signal,
    headers: { Authorization: "Bearer " + session.access_token, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || "Request failed.");
  return result;
}

function Fields({ values }) {
  return <dl className="owner-fields">{Object.entries(values).map(([key, value]) =>
    <div key={key}><dt>{key}</dt><dd>{display(value)}</dd></div>)}</dl>;
}

function Support({ target, email, plan, actor, updated }) {
  const [operation, setOperation] = useState("revoke_sessions");
  const [reason, setReason] = useState("");
  const [end, setEnd] = useState("");
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  function review(event) {
    event.preventDefault();
    const expires = end && new Date(end + "Z");
    if (operation === "extend_trial" && !(expires > new Date() && expires > new Date(plan["Trial end"]))) {
      setMessage("Choose a UTC expiration later than both now and the current trial end."); return;
    }
    setMessage("");
    setPending({ view: "action", requestId: crypto.randomUUID(), target, operation, reason: reason.trim(),
      end: operation === "extend_trial" ? expires.toISOString() : null });
  }
  async function confirm() {
    setBusy(true);
    try {
      const result = await request(pending, actor);
      setPending(null); setReason(""); setMessage(result.message); updated();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  return <section><h2>Account support</h2>
    {pending ? <div><p>Confirm {pending.operation === "extend_trial" ? "trial extension to " + display(pending.end) : "revocation of all sessions"} for <strong>{email || target}</strong>.</p>
      <p>Reason: {pending.reason}</p>
      <button disabled={busy} onClick={confirm}>Confirm action</button> <button disabled={busy} onClick={() => setPending(null)}>Back</button>
    </div> : <form onSubmit={review}>
      <div><label htmlFor="support-operation">Action</label><select id="support-operation" value={operation} onChange={e => setOperation(e.target.value)}>
        <option value="revoke_sessions">Revoke sessions</option>
        {plan.Source === "trial" && <option value="extend_trial">Extend trial</option>}
      </select></div>
      {operation === "extend_trial" ? <label>New expiration (UTC) · currently {display(plan["Trial end"])}
        <input required type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} /></label>
        : <p>Revocation prevents session refresh. Existing access tokens can work until they expire.</p>}
      <label>Reason<input required maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label>
      <button disabled={!reason.trim()}>Review action</button>
    </form>}
    <p role="status">{message}</p>
  </section>;
}

function Account({ data, actor, updated }) {
  return <><Link to="/admin">← User directory</Link>
    <h1>{data.account.Name || data.account.Email || "Account"}</h1>
    {[["Identity",data.account],["Preferences",data.preferences],["Plan",data.plan],["Saved work",data.work]].map(([title,values]) =>
      <section key={title}><h2>{title}</h2><Fields values={values}/></section>)}
    <section><h2>Recorded sessions ({data.sessions.length})</h2>
      <p>Session timestamps show recorded activity. Live presence is unknown.</p>
      {data.sessions.map((session,i) => <details key={i}><summary>{display(session.Created)} · {display(session.IP)}</summary><Fields values={session}/></details>)}</section>
    <section><h2>Activity timeline</h2><p>Latest recorded activity: {display(data.timeline[0]?.at)}. Earlier events may be unavailable.</p>
      <ol>{data.timeline.map((e,i) => <li key={i}><time>{display(e.at)}</time> · {e.label}</li>)}</ol></section>
    <Support target={data.account["User ID"]} email={data.account.Email} plan={data.plan} actor={actor} updated={updated}/>
  </>;
}

function Dashboard({ actor, userId }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);
  const [version, setVersion] = useState(0);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const read = body => request(body, actor, controller.signal);
    setError("");
    const result = userId ? read({ view: "detail", target: userId }) :
      Promise.all([read({ view: "overview" }), read({ view: "directory", search: filter, page })]);
    result.then(data => { if (!controller.signal.aborted) setResponse(data); })
      .catch(e => { if (!controller.signal.aborted) { setResponse(null); setError(e.message); } });
    return () => controller.abort();
  }, [actor,userId,filter,page,version]);
  const refresh = () => setVersion(v => v+1);
  if (error) return <><h1>Owner dashboard</h1><p role="alert">{error}</p><button onClick={refresh}>Try again</button> <Link to="/admin">Directory</Link></>;
  if (!response) return <p role="status">Loading dashboard…</p>;
  if (userId) return <Account data={response} actor={actor} updated={refresh}/>;
  const [overview,directory] = response;
  function changePage(next) { setResponse(null); setPage(next); }
  return <><h1>Owner dashboard</h1><section><h2>Overview</h2><Fields values={overview}/></section>
    <section><h2>User directory</h2>
      <form onSubmit={e => { e.preventDefault(); setResponse(null); setPage(0); setFilter(search.trim()); refresh(); }}>
        <label>Name or email<input type="search" maxLength={254} value={search} onChange={e => setSearch(e.target.value)}/></label><button>Search</button>
      </form>
      {directory.rows.length ? <div className="owner-table"><table><thead><tr>{["Account","Joined","Last sign-in","Plan"].map(h => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{directory.rows.map(row => <tr key={row.id}><td><Link to={"/admin/"+row.id}>{row.name || row.email || row.id}</Link><br/>{row.email}</td>
          <td>{display(row.joined)}</td><td>{display(row.signed_in)}</td><td>{row.plan}</td></tr>)}</tbody></table></div> : <p>No matching accounts.</p>}
      <button disabled={!page} onClick={() => changePage(page-1)}>Previous</button> Page {page+1} <button disabled={!directory.more} onClick={() => changePage(page+1)}>Next</button>
    </section></>;
}

export default function OwnerDashboard() {
  const { userId } = useParams();
  const [actor, setActor] = useState(undefined);
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_,session) => setActor(session?.user.id || null));
    return () => subscription.unsubscribe();
  }, []);
  return <main className="owner-dashboard"><header><Link to="/bench">Kyphira</Link></header>
    {actor === undefined ? <p>Checking session…</p> : actor ? <Dashboard key={actor + (userId || "")} actor={actor} userId={userId}/> :
      <><h1>Owner dashboard</h1><p>Sign in with your owner account, then return to this page.</p><Link to="/bench">Sign in</Link></>}
  </main>;
}
