import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "rsvp_cumple";
const ADMIN_PASSWORD = "agustin22";

const EVENT = {
  title: "CUMPLEAÑOS",
  name: "AGUSTÍN",
  age: "22",
  date: "01 MAY",
  time: "19:30",
  place: "SUM BARRIO VALE",
  address: "Lopez Jordan 2775",
  mapsUrl: "https://maps.app.goo.gl/6vuns9139YAV472Z8",
  calendarUrl:
    "https://calendar.google.com/calendar/u/0/r/eventedit/Nzk4cjNocmIyZDdvOWxyZ2hvcWQ0M3BxbWogYWd1c3RpbkBnZWVrc2hpdmUuY29t",
  note: "Trae para tomar y caguemonos de risa un ratikoo",
};

const BACKGROUND_IMAGE = "/agustin-bg.jpeg";
const RSVP_ENDPOINT = "https://script.google.com/macros/s/AKfycbz2g9DWDsT_rkcur4KZGjMXZ3lA-JsajKMKoRcgUsqBU39IleeTHooBziWiRcPGQLmg/exec";

function Icon({ name }) {
  const icons = {
    calendar: "📅",
    clock: "🕘",
    pin: "📍",
    right: "→",
    left: "←",
    check: "✓",
    x: "×",
    download: "↓",
    lock: "🔒",
    refresh: "↻",
  };
  return <span className="icon">{icons[name] || "•"}</span>;
}

function safeParseConfirmations(raw) {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildRSVP({ name, answer }) {
  return {
    nombre: String(name || "").trim(),
    respuesta: answer,
    fecha: new Date().toLocaleString("es-AR"),
  };
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function buildCSV(data) {
  const header = ["Nombre", "Respuesta", "Fecha"];
  const rows = data.map((r) => [r.nombre, r.respuesta, r.fecha].map(csvEscape).join(","));
  return [header.join(","), ...rows].join("\n");
}

function normalizeRemoteRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => ({
    nombre: r.nombre || r.Nombre || "",
    respuesta: r.respuesta || r.Respuesta || "",
    fecha: r.fecha || r.Fecha || "",
  }));
}

function runSelfTests() {
  if (typeof window === "undefined" || window.__RSVP_TESTS_RAN__) return;
  window.__RSVP_TESTS_RAN__ = true;
  console.assert(Array.isArray(safeParseConfirmations("[]")), "safeParseConfirmations parses arrays");
  console.assert(safeParseConfirmations("not json").length === 0, "safeParseConfirmations handles invalid JSON");
  console.assert(buildRSVP({ name: " Ana ", answer: "si" }).nombre === "Ana", "buildRSVP trims names");
  console.assert(buildCSV([{ nombre: "A, B", respuesta: "si", fecha: "hoy" }]).includes('"A, B"'), "buildCSV escapes commas");
  console.assert(normalizeRemoteRows([{ Nombre: "Juan", Respuesta: "si", Fecha: "hoy" }])[0].nombre === "Juan", "normalizeRemoteRows accepts sheet headers");
  console.assert(buildCSV([{ nombre: "Agustín", respuesta: "no", fecha: "01/05" }]).includes("Agustín"), "buildCSV keeps accents");
}
runSelfTests();

export default function InvitacionInteractiva() {
  const [isAdminRoute, setIsAdminRoute] = useState(false);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [answer, setAnswer] = useState("");
  const [savedVersion, setSavedVersion] = useState(0);

  useEffect(() => {
    const checkRoute = () => setIsAdminRoute(window.location.hash === "#admin");
    checkRoute();
    window.addEventListener("hashchange", checkRoute);
    return () => window.removeEventListener("hashchange", checkRoute);
  }, []);

  const confirmations = useMemo(() => {
    if (typeof localStorage === "undefined") return [];
    return safeParseConfirmations(localStorage.getItem(STORAGE_KEY));
  }, [savedVersion]);

  const saveRSVP = async () => {
    const newItem = buildRSVP({ name, answer });

    if (typeof localStorage !== "undefined") {
      const current = safeParseConfirmations(localStorage.getItem(STORAGE_KEY));
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...current, newItem]));
      setSavedVersion((v) => v + 1);
    }

    if (RSVP_ENDPOINT) {
      try {
        await fetch(RSVP_ENDPOINT, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newItem),
        });
      } catch (error) {
        console.error("No se pudo guardar online. Quedó guardado localmente.", error);
      }
    }

    setStep(6);
  };

  useEffect(() => {
    if (!isAdminRoute && step >= 0 && step <= 2) {
      const timer = setTimeout(() => setStep((s) => Math.min(s + 1, 3)), 2600);
      return () => clearTimeout(timer);
    }
  }, [step, isAdminRoute]);

  const next = () => setStep((s) => Math.min(s + 1, 6));
  const back = () => setStep((s) => Math.max(s - 1, 3));

  if (isAdminRoute) {
    return <AdminPanel localConfirmations={confirmations} refreshLocal={() => setSavedVersion((v) => v + 1)} />;
  }

  return (
    <Shell>
      <main className="phone">
        <Header step={step} />
        <FloatingFace step={step} answer={answer} submitted={step === 6} />

        <AnimatePresence mode="wait">
          {step === 0 && (
            <Screen key="hola" center>
              <BigTitle>HOLA</BigTitle>
            </Screen>
          )}

          {step === 1 && (
            <Screen key="cumplo" center>
              <BigTitle>CUMPLO<br />{EVENT.age} AÑOS</BigTitle>
            </Screen>
          )}

          {step === 2 && (
            <Screen key="invitado">
              <div className="heroBlock">
                <p className="kicker">INVITACIÓN OFICIAL</p>
                <BigTitle>ESTÁS<br />INVITADO</BigTitle>
                <h2 className="subtitle">CUMPLEAÑOS<br />AGUSTÍN</h2>
              </div>
            </Screen>
          )}

          {step === 3 && (
            <Screen key="identify">
              <div className="card">
                <p className="eyebrow">Acceso a la invitación</p>
                <h1 className="sectionTitle">¿QUIÉN SOS?</h1>
                <label className="label">TU NOMBRE COMPLETO</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="input" autoFocus placeholder="Escribí tu nombre" />
              </div>
              <Button disabled={!name.trim()} onClick={next}>Ingresar <Icon name="right" /></Button>
            </Screen>
          )}

          {step === 4 && (
            <Screen key="details">
              <div className="card">
                <p className="eyebrow">Información del evento</p>
                <h1 className="sectionTitle">EL EVENTO</h1>
                <div className="infoList">
                  <Info icon={<Icon name="calendar" />} label="FECHA" value={EVENT.date} />
                  <Info icon={<Icon name="clock" />} label="HORA" value={EVENT.time} />
                  <Info icon={<Icon name="pin" />} label="LUGAR" value={EVENT.place} sub={EVENT.address} />
                </div>
                <div className="note">{EVENT.note}</div>
                <div className="linkGrid">
                  <a href={EVENT.calendarUrl} target="_blank" rel="noreferrer" className="linkBtn ghost">Agendar <Icon name="calendar" /></a>
                  <a href={EVENT.mapsUrl} target="_blank" rel="noreferrer" className="linkBtn red">Ubicación <Icon name="pin" /></a>
                </div>
              </div>
              <Button onClick={next}>Confirmar asistencia <Icon name="right" /></Button>
            </Screen>
          )}

          {step === 5 && (
            <Screen key="confirm">
              <div className="card confirmCard">
                <p className="eyebrow">Confirmación</p>
                <h1 className="sectionTitle">¿VENÍS?</h1>
                <div className="options">
                  <Option active={answer === "si"} onClick={() => setAnswer("si")} icon={<Icon name="check" />} text="SÍ, VOY" />
                  <Option active={answer === "no"} onClick={() => setAnswer("no")} icon={<Icon name="x" />} text="NO VOY" />
                </div>
              </div>
              <Button disabled={!answer} onClick={saveRSVP}>Enviar <Icon name="right" /></Button>
            </Screen>
          )}

          {step === 6 && (
            <Screen key="thanks" center>
              <div className="card successCard">
                <div className="successIcon">✓</div>
                <p className="eyebrow">Confirmación enviada</p>
                <h1 className="sectionTitle">RESPUESTA RECIBIDA</h1>
                <p className="paragraph">Gracias, {name}. Tu confirmación quedó registrada.</p>
                <div className="statusBox">
                  <span>ESTADO</span>
                  <strong>{answer === "si" ? "CONFIRMADO" : "NO ASISTE"}</strong>
                </div>
              </div>
              <button onClick={() => { setStep(0); setName(""); setAnswer(""); }} className="secondaryButton">Volver al inicio</button>
            </Screen>
          )}
        </AnimatePresence>

        {step > 3 && step < 6 && <button onClick={back} className="backBtn"><Icon name="left" /> VOLVER</button>}
      </main>
    </Shell>
  );
}

function AdminPanel({ localConfirmations, refreshLocal }) {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [remoteRows, setRemoteRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const rows = RSVP_ENDPOINT ? remoteRows : localConfirmations;
  const confirmed = rows.filter((r) => r.respuesta === "si").length;
  const declined = rows.filter((r) => r.respuesta === "no").length;

  const fetchRemoteRows = async () => {
    if (!RSVP_ENDPOINT) {
      refreshLocal();
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(RSVP_ENDPOINT);
      const data = await res.json();
      setRemoteRows(normalizeRemoteRows(data.rows || data));
    } catch {
      setError("No pude leer la base online. Revisá el endpoint o permisos del Apps Script.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (unlocked) fetchRemoteRows();
  }, [unlocked]);

  const downloadCSV = () => {
    const blob = new Blob([buildCSV(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "confirmaciones-rsvp.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Shell>
      <main className="adminWrap">
        {!unlocked ? (
          <div className="adminLogin card">
            <div className="adminTitle">ADMIN<br />PRIVADO</div>
            <p className="paragraph">Ingresá la contraseña para ver confirmaciones.</p>
            <label className="label"><Icon name="lock" /> CONTRASEÑA</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
            <Button disabled={password !== ADMIN_PASSWORD} onClick={() => setUnlocked(true)}>Entrar <Icon name="right" /></Button>
            <a href="#" className="adminLink">Volver a la invitación</a>
          </div>
        ) : (
          <div>
            <div className="adminTop">
              <div>
                <p className="eyebrow">Control privado</p>
                <h1 className="adminTitle">PANEL<br />ADMIN</h1>
                <p className="paragraph small">Solo visible desde <b>#admin</b> con contraseña.</p>
              </div>
              <button onClick={fetchRemoteRows} className="miniBtn"><Icon name="refresh" /> Actualizar</button>
            </div>

            <div className="statsGrid">
              <Stat value={rows.length} label="TOTAL" />
              <Stat value={confirmed} label="SÍ VAN" />
              <Stat value={declined} label="NO VAN" />
              <Stat value={Math.ceil(confirmed * 3)} label="SANGUCHES BONDIOLA" />
            </div>

            {error && <div className="errorBox">{error}</div>}
            {loading && <div className="loading">Cargando...</div>}

            <div className="tableCard">
              <div className="tableHead"><span>Nombre</span><span>Respuesta</span><span>Fecha</span></div>
              {rows.length === 0 ? (
                <p className="empty">Todavía no hay confirmaciones.</p>
              ) : rows.map((r, i) => (
                <div key={`${r.nombre}-${i}`} className="tableRow">
                  <span>{r.nombre}</span>
                  <span>{r.respuesta === "si" ? "SÍ" : "NO"}</span>
                  <span>{r.fecha}</span>
                </div>
              ))}
            </div>

            <button onClick={downloadCSV} className="downloadBtn">Descargar CSV / Excel <Icon name="download" /></button>
            <a href="#" className="adminLink">Volver a la invitación</a>
          </div>
        )}
      </main>
    </Shell>
  );
}

function FloatingFace({ step, answer, submitted }) {
  const FACE_SIZE = 92;
  const MARGIN = 18;
  const BASE_RIGHT = 18;
  const BASE_BOTTOM = 22;

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [mood, setMood] = useState("poker");
  const [message, setMessage] = useState("");

  const showByStep = step >= 3;

  const getSafeRandomPosition = () => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const minX = -(viewportWidth - FACE_SIZE - BASE_RIGHT - MARGIN);
    const maxX = -BASE_RIGHT + MARGIN;

    const minY = -(viewportHeight - FACE_SIZE - BASE_BOTTOM - MARGIN);
    const maxY = -BASE_BOTTOM + MARGIN;

    return {
      x: minX + Math.random() * (maxX - minX),
      y: minY + Math.random() * (maxY - minY),
    };
  };

  const moveToRandomVisibleSpot = () => {
    setPosition(getSafeRandomPosition());
  };

  const moveToDefaultVisibleSpot = () => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const x = -(viewportWidth * 0.18);
    const y = -(viewportHeight * 0.18);

    setPosition({ x, y });
  };

  const showTemporaryFace = (nextMood, nextMessage = "") => {
    setMood(nextMood);
    setMessage(nextMessage);
    moveToRandomVisibleSpot();

    window.setTimeout(() => {
      setMood("poker");
      setMessage("");
    }, 1800);
  };

  const handleClick = () => {
    if (step === 3) {
      showTemporaryFace("happy", "hoola k paso?");
      return;
    }

    if (step === 4) {
      showTemporaryFace("angry", "mas vale que vayas hdp");
      return;
    }

    moveToRandomVisibleSpot();
  };

  useEffect(() => {
    if (showByStep) {
      moveToDefaultVisibleSpot();
      setMood("poker");
      setMessage("");
    }
  }, [step]);

  useEffect(() => {
    if (!submitted) return;

    if (answer === "si") {
      showTemporaryFace("happy", "traee para tomarr");
    }

    if (answer === "no") {
      showTemporaryFace("angry", "ni queria que vayas igualll");
    }
  }, [submitted, answer]);

  if (!showByStep) return null;

  const faceImage =
    mood === "happy"
      ? "/cara-feliz.png"
      : mood === "angry"
      ? "/cara-enojada.png"
      : "/cara-poker.png";

      

  return (
    <motion.div
      className="faceActor"
      animate={{ x: position.x, y: position.y, rotate: mood === "poker" ? 0 : [0, -7, 7, 0] }}
      transition={{ duration: 1.45, ease: "easeInOut" }}
    >
      <button
        type="button"
        className={`floatingFace ${mood}`}
        onClick={handleClick}
        aria-label="Botón interactivo"
      >
        <img
  className={`faceImage ${mood === "poker" ? "pokerSmall" : ""}`}
  src={faceImage}
  alt="cara interactiva"
/>
      </button>

      <AnimatePresence>
        {message && (
          <motion.div
            className="faceDialog"
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Header({ step }) {
  return (
    <header className="topHeader">
      <div className="brand">{EVENT.title}<br />{EVENT.name}</div>
      <div className="counter">00{step + 1}_INVITACIÓN</div>
    </header>
  );
}

function Shell({ children }) {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const move = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 8;
      const y = (e.clientY / window.innerHeight - 0.5) * 8;
      setMouse({ x, y });
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  return (
    <div className="appShell" style={{ "--bg-image": `url(${BACKGROUND_IMAGE})` }}>
      <motion.div className="bgPhoto" style={{ transform: `translate(${mouse.x}px, ${mouse.y}px) scale(1.08)` }} />
      <div className="redVeil" />
      <div className="gridLayer" />
      <div className="glow glowOne" />
      <div className="glow glowTwo" />
      {[...Array(9)].map((_, i) => (
        <motion.div
          key={i}
          className="floatingDot"
          style={{ left: `${8 + i * 11}%`, top: `${18 + (i % 5) * 14}%` }}
          animate={{ y: [0, -14, 0], opacity: [0.15, 0.55, 0.15] }}
          transition={{ duration: 4 + i * 0.35, repeat: Infinity }}
        />
      ))}
      {children}
      <Styles />
    </div>
  );
}

function Screen({ children, center }) {
  return (
    <motion.section
      className={`screen ${center ? "center" : ""}`}
      initial={{ opacity: 0, y: 34, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -28, scale: 0.985 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      {children}
    </motion.section>
  );
}

function BigTitle({ children }) {
  return (
    <motion.h1
      className="bigTitle"
      initial={{ letterSpacing: "-.08em", opacity: 0, y: 18 }}
      animate={{ letterSpacing: "-.04em", opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
    >
      {children}
    </motion.h1>
  );
}

function Button({ children, disabled, onClick }) {
  return <button disabled={disabled} onClick={onClick} className="mainButton">{children}</button>;
}

function Info({ icon, label, value, sub }) {
  return (
    <div className="infoItem">
      <div className="infoIcon">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {sub && <span>{sub}</span>}
      </div>
    </div>
  );
}

function Option({ active, onClick, icon, text }) {
  return <button onClick={onClick} className={`optionBtn ${active ? "active" : ""}`}><span>{icon}</span>{text}</button>;
}

function Stat({ value, label }) {
  return <div className="stat"><strong>{value}</strong><span>{label}</span></div>;
}

function Styles() {
  return (
    <style>{`
      :root {
        --black: #050505;
        --red-900: #3b0505;
        --red-700: #8f1111;
        --red-600: #dc2626;
        --red-500: #ef4444;
        --red-400: #f87171;
        --red-300: #fca5a5;
        --white: #ffffff;
      }
      * { box-sizing: border-box; }
      html, body, #root { min-height: 100%; }
      body { margin: 0; background: var(--black); }
      .appShell {
        min-height: 100vh;
        width: 100%;
        position: relative;
        overflow: hidden;
        background: #000; /* base negra para mobile */
        color: white;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .bgPhoto {
        position: absolute;
        inset: 0;
        background: var(--bg-image);
        background-size: cover;
        background-position: center;
        filter: none; /* sin niebla */
        opacity: 1; /* imagen clara */
      }
      .redVeil { display:none; }
      .gridLayer { display:none; }
      .glow { display:none; }
      .glowOne { background: var(--red-600); top: -140px; left: -120px; }
      .glowTwo { background: var(--red-700); bottom: -160px; right: -120px; opacity: .35; }
      .floatingDot { display:none; }
      .phone {
        position: relative;
        z-index: 5;
        width: 100%;
        max-width: 430px;
        min-height: 100vh;
        margin: 0 auto;
        padding: 34px 22px 28px;
        display: flex;
        flex-direction: column;
      }
      .pokerSmall {
      transform: scale(0.7);
      }
      .topHeader { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; }
      .brand { color: var(--red-500); font-size: 20px; line-height: .88; font-weight: 1000; letter-spacing: -.03em; text-shadow: 0 0 24px rgba(239,68,68,.4); }
      .counter { color: rgba(255,255,255,.62); font-size: 10px; letter-spacing: .28em; font-weight: 800; margin-top: 2px; white-space: nowrap; }
      .screen { flex: 1; width: 100%; min-width: 0; display: flex; flex-direction: column; position: relative; padding-top: 28px; overflow: visible; }
      .screen.center { justify-content: center; align-items: center; text-align: center; padding-bottom: 60px; }
      .heroBlock { width: 100%; max-width: 100%; margin: auto 0; text-align: left; overflow: visible; }
      .kicker, .eyebrow { color: rgba(255,255,255,.64); font-size: 11px; letter-spacing: .32em; font-weight: 1000; margin: 0 0 18px; text-transform: uppercase; }
      .eyebrow { letter-spacing: .18em; margin-bottom: 14px; }
      .bigTitle {
        width: 100%;
        max-width: 100%;
        font-size: clamp(48px, 15vw, 76px);
        line-height: .96;
        margin: 0;
        font-weight: 1000;
        letter-spacing: -.045em;
        text-transform: uppercase;
        color: var(--red-500);
        text-shadow: 0 0 24px rgba(239,68,68,.45), 0 18px 50px rgba(0,0,0,.7);
        padding-top: 6px;
      }
      .subtitle { font-size: 31px; line-height: .96; letter-spacing: -.04em; font-weight: 1000; margin: 28px 0 0; color: white; }
      .card {
        width: 100%;
        max-width: 100%;
        margin-top: 34px;
        padding: 25px;
        border-radius: 28px;
        background: rgba(10,10,10,.78);
        border: 1px solid rgba(239,68,68,.22);
        box-shadow: 0 24px 70px rgba(0,0,0,.46), 0 0 60px rgba(239,68,68,.08);
      }
      .sectionTitle { font-size: clamp(36px, 11vw, 48px); line-height: .98; margin: 0 0 28px; color: var(--red-500); font-weight: 1000; letter-spacing: -.05em; text-transform: uppercase; text-shadow: 0 0 22px rgba(239,68,68,.28); padding-top: 4px; }
      .label { display: flex; gap: 8px; align-items: center; margin-top: 10px; color: rgba(255,255,255,.66); font-size: 12px; font-weight: 1000; letter-spacing: .1em; text-transform: uppercase; }
      .input { width: 100%; margin-top: 12px; border: none; border-bottom: 2px solid rgba(255,255,255,.72); background: transparent; outline: none; color: white; font-size: 23px; font-weight: 900; padding: 14px 0; }
      .input::placeholder { color: rgba(255,255,255,.28); }
      .mainButton { width: 100%; margin-top: auto; margin-bottom: 4px; min-height: 60px; border-radius: 999px; border: 2px solid var(--red-500); background: rgba(239,68,68,.1); color: var(--red-400); font-weight: 1000; font-size: 15px; letter-spacing: .08em; text-transform: uppercase; display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; box-shadow: 0 16px 40px rgba(239,68,68,.14); transition: transform .15s ease, opacity .15s ease, background .15s ease; }
      .mainButton:active { transform: scale(.985); }
      .mainButton:disabled { opacity: .35; cursor: not-allowed; }
      .mainButton:not(:disabled):hover { background: rgba(239,68,68,.18); }
      .infoList { display: grid; gap: 16px; }
      .infoItem { display: flex; gap: 15px; align-items: center; padding-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,.12); }
      .infoIcon { width: 44px; height: 44px; display: grid; place-items: center; background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.18); border-radius: 16px; font-size: 22px; }
      .infoItem p { margin: 0 0 2px; color: rgba(255,255,255,.55); font-size: 11px; font-weight: 1000; letter-spacing: .14em; }
      .infoItem strong { display: block; font-size: 30px; line-height: 1; font-weight: 1000; letter-spacing: -.03em; }
      .infoItem span { display: block; color: rgba(255,255,255,.68); font-size: 14px; margin-top: 5px; }
      .note { margin-top: 20px; background: rgba(255,255,255,.94); color: #111; padding: 16px; border-radius: 18px; font-weight: 900; line-height: 1.35; }
      .linkGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; }
      .linkBtn { height: 52px; border-radius: 999px; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 7px; font-weight: 1000; text-transform: uppercase; font-size: 12px; }
      .linkBtn.ghost { background: rgba(255,255,255,.08); color: white; border: 1px solid rgba(255,255,255,.2); }
      .linkBtn.red { background: var(--red-600); color: white; border: 1px solid var(--red-500); box-shadow: 0 14px 30px rgba(239,68,68,.22); }
      .confirmCard { margin-top: 80px; }
      .options { display: grid; gap: 14px; }
      .optionBtn { width: 100%; min-height: 72px; border-radius: 24px; border: 1px solid rgba(255,255,255,.16); background: rgba(255,255,255,.055); color: rgba(255,255,255,.55); display: flex; align-items: center; gap: 14px; padding: 0 20px; font-size: 29px; font-weight: 1000; letter-spacing: -.04em; cursor: pointer; transition: .18s ease; }
      .optionBtn span { color: var(--red-500); font-size: 30px; }
      .optionBtn.active { color: white; background: rgba(239,68,68,.16); border-color: rgba(239,68,68,.72); box-shadow: 0 18px 45px rgba(239,68,68,.14); }
      .successCard { text-align: left; }
      .successIcon { width: 74px; height: 74px; background: var(--red-600); color: white; border-radius: 999px; display: grid; place-items: center; font-size: 40px; font-weight: 1000; margin-bottom: 24px; box-shadow: 0 18px 45px rgba(239,68,68,.28); }
      .paragraph { color: rgba(255,255,255,.74); font-size: 16px; line-height: 1.45; margin: 14px 0 0; }
      .paragraph.small { font-size: 14px; }
      .statusBox { margin-top: 22px; border: 1px solid rgba(255,255,255,.15); border-radius: 20px; padding: 18px; background: rgba(255,255,255,.035); }
      .statusBox span { display: block; color: rgba(255,255,255,.55); font-size: 11px; font-weight: 1000; letter-spacing: .16em; }
      .statusBox strong { display: block; margin-top: 4px; font-size: 30px; font-weight: 1000; }
      .secondaryButton { width: 100%; margin-top: 18px; min-height: 54px; border-radius: 999px; border: 1px solid rgba(255,255,255,.2); background: rgba(255,255,255,.06); color: white; font-weight: 1000; text-transform: uppercase; cursor: pointer; }
      .backBtn { margin: 10px auto 0; background: transparent; border: none; color: rgba(255,255,255,.62); font-size: 12px; font-weight: 1000; letter-spacing: .12em; cursor: pointer; display: flex; align-items: center; gap: 6px; }
      .faceActor {
        position: fixed;
        right: 18px;
        bottom: 22px;
        z-index: 50;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 10px;
        pointer-events: none;
      }
      .floatingFace {
        width: 92px;
        height: 92px;
        border: none;
        background: transparent;
        color: white;
        display: grid;
        place-items: center;
        cursor: pointer;
        box-shadow: none;
        overflow: visible;
        padding: 0;
        touch-action: manipulation;
        pointer-events: auto;
      }
      .floatingFace.poker,
      .floatingFace.angry,
      .floatingFace.happy {
        background: transparent;
        border: none;
        box-shadow: none;
      }
      .faceImage {
        width: 100%;
        height: 100%;
        object-fit: contain;
        object-position: center;
        display: block;
        filter: drop-shadow(0 14px 22px rgba(0,0,0,.65));
      }
      .faceDialog {
        background: rgba(5,5,5,.9);
        color: white;
        border: 1px solid rgba(239,68,68,.45);
        border-radius: 18px 18px 4px 18px;
        padding: 12px 15px;
        font-size: 13px;
        font-weight: 1000;
        letter-spacing: .02em;
        box-shadow: 0 14px 35px rgba(0,0,0,.42);
        max-width: 210px;
        text-align: right;
        pointer-events: none;
      }
      .icon { display: inline-flex; line-height: 1; align-items: center; justify-content: center; }
      .adminWrap { position: relative; z-index: 5; max-width: 820px; margin: 0 auto; min-height: 100vh; padding: 38px 20px; }
      .adminLogin { max-width: 430px; min-height: 520px; margin: 40px auto; display: flex; flex-direction: column; justify-content: center; }
      .adminTitle { color: var(--red-500); font-size: 56px; line-height: .84; font-weight: 1000; letter-spacing: -.06em; }
      .adminLink { display: block; color: rgba(255,255,255,.62); margin-top: 18px; }
      .adminTop { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; }
      .miniBtn { border: 1px solid rgba(255,255,255,.2); color: white; background: rgba(255,255,255,.08); border-radius: 999px; padding: 12px 15px; font-weight: 900; cursor: pointer; }
      .statsGrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 28px; }
      .stat { background: rgba(255,255,255,.94); color: #111; border-radius: 24px; padding: 22px 16px; text-align: center; box-shadow: 0 22px 50px rgba(0,0,0,.24); }
      .stat strong { display: block; font-size: 42px; line-height: .9; font-weight: 1000; }
      .stat span { display: block; margin-top: 8px; font-size: 11px; font-weight: 1000; color: rgba(0,0,0,.62); }
      .tableCard { margin-top: 24px; background: rgba(255,255,255,.96); color: #111; border-radius: 24px; overflow: hidden; box-shadow: 0 24px 70px rgba(0,0,0,.3); }
      .tableHead, .tableRow { display: grid; grid-template-columns: 1.2fr .7fr 1.1fr; gap: 12px; padding: 14px 16px; }
      .tableHead { background: var(--red-700); color: white; font-weight: 1000; font-size: 13px; }
      .tableRow { border-bottom: 1px solid rgba(0,0,0,.08); font-size: 14px; font-weight: 800; }
      .empty { padding: 20px; font-weight: 800; }
      .downloadBtn { width: 100%; margin-top: 18px; border: none; border-radius: 999px; min-height: 56px; background: var(--red-600); color: white; font-weight: 1000; text-transform: uppercase; cursor: pointer; box-shadow: 0 20px 50px rgba(239,68,68,.24); }
      .errorBox { margin-top: 18px; background: var(--red-700); padding: 14px; border-radius: 16px; font-weight: 900; }
      .loading { margin-top: 18px; color: rgba(255,255,255,.72); font-weight: 900; }
      @media (max-width: 560px) {
        .phone { padding: 34px 18px 28px; }
        .bigTitle { font-size: clamp(44px, 15vw, 62px); }
        .sectionTitle { font-size: clamp(34px, 10vw, 42px); }
        .subtitle { font-size: 28px; }
        .card { padding: 23px; border-radius: 26px; }
        .statsGrid { grid-template-columns: repeat(2, 1fr); }
        .adminTop { flex-direction: column; }
        .tableHead, .tableRow { grid-template-columns: 1fr .55fr 1fr; font-size: 12px; }
      }
    `}</style>
  );
}
