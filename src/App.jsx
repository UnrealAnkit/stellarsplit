/**
 * StellarSplit — On-chain bill splitting on Stellar
 * Aesthetic: Neon-Noir Receipt Ledger
 * Font: Syne (display) + DM Mono (body)
 */

import { useState, useCallback } from "react";
import { useWallet } from "./lib/useWallet";
import { useSplit  } from "./lib/useSplit";
import {
  generateKeypair, fundTestnet, getBalance, settlePayment,
} from "./lib/stellar";

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:      "#080B12",
  bg2:     "#0C1018",
  surface: "#111622",
  card:    "#141B2D",
  border:  "#1E2D4A",
  border2: "#243356",
  lime:    "#C8FF00",
  cyan:    "#00E5FF",
  orange:  "#FF6B2C",
  pink:    "#FF3CAC",
  green:   "#00FF88",
  red:     "#FF4444",
  yellow:  "#FFD600",
  text:    "#EEF2FF",
  muted:   "#4A5A80",
  muted2:  "#2A3A5A",
  stellar: "#3E8EFF",
};

// ── Tiny reusable primitives ──────────────────────────────────────────────────
const Badge = ({ children, color = T.lime }) => (
  <span style={{ background: color + "18", color, border: `1px solid ${color}44`,
    borderRadius: 20, padding: "2px 10px", fontSize: 10, fontWeight: 500, letterSpacing: "0.08em" }}>
    {children}
  </span>
);

const Pill = ({ label, value, color = T.lime }) => (
  <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 18px", textAlign: "center", flex: 1, minWidth: 90 }}>
    <div style={{ fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 9, color: T.muted, marginTop: 5, letterSpacing: "0.12em", textTransform: "uppercase" }}>{label}</div>
  </div>
);

const Inp = ({ style={}, ...p }) => (
  <input style={{ width: "100%", background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 8,
    padding: "10px 14px", color: T.text, fontSize: 12, outline: "none",
    transition: "border .15s", ...style }} {...p}
    onFocus={e => { e.target.style.borderColor = T.lime; if(p.onFocus) p.onFocus(e); }}
    onBlur={e  => { e.target.style.borderColor = T.border; if(p.onBlur) p.onBlur(e); }} />
);

const Sel = ({ style={}, children, ...p }) => (
  <select style={{ width: "100%", background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 8,
    padding: "10px 14px", color: T.text, fontSize: 12, outline: "none", ...style }} {...p}>
    {children}
  </select>
);

const Btn = ({ children, color=T.lime, outline=false, style={}, ...p }) => (
  <button style={{
    background: outline ? "transparent" : color,
    color: outline ? color : (color === T.lime || color === T.yellow ? "#000" : "#fff"),
    border: `1px solid ${color}`,
    borderRadius: 8, padding: "10px 20px", fontSize: 11, fontWeight: 600,
    letterSpacing: "0.1em", textTransform: "uppercase", ...style }} {...p}>
    {children}
  </button>
);

const Status = ({ type, msg }) => {
  const map = { success:[T.green,"#021A0A"], error:[T.red,"#1A0202"], info:[T.cyan,"#021018"], warn:[T.yellow,"#1A1400"] };
  const [col, bg] = map[type] || map.info;
  return (
    <div style={{ padding:"10px 14px", borderRadius:8, fontSize:11, border:`1px solid ${col}44`,
      background:bg, color:col, marginTop:10, display:"flex", gap:8, alignItems:"flex-start" }}>
      <span style={{flexShrink:0}}>{type==="success"?"✓":type==="error"?"✗":"ℹ"}</span> {msg}
    </div>
  );
};

const Spinner = ({ color=T.lime }) => (
  <div style={{ width:14, height:14, border:`2px solid ${T.border2}`,
    borderTopColor:color, borderRadius:"50%", animation:"spin .7s linear infinite", flexShrink:0 }} />
);

// ── Section header (receipt-style) ────────────────────────────────────────────
const SectionHead = ({ children, color=T.lime }) => (
  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
    <div style={{ width:3, height:18, background:color, borderRadius:2, flexShrink:0 }} />
    <span style={{ fontFamily:"Syne,sans-serif", fontSize:12, fontWeight:700, color,
      letterSpacing:"0.18em", textTransform:"uppercase" }}>{children}</span>
    <div style={{ flex:1, height:1, background:T.border, marginLeft:4 }} />
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — Wallets  (set up accounts)
// ═══════════════════════════════════════════════════════════════════════════════
function WalletsTab({ accounts, setAccounts, wallet }) {
  const [label, setLabel]   = useState("");
  const [loading, setLoad]  = useState(false);
  const [status, setStatus] = useState(null);
  const [show, setShow]     = useState({});

  const create = async () => {
    if (!label.trim()) { setStatus({ type:"warn", msg:"Enter a name first." }); return; }
    setLoad(true); setStatus({ type:"info", msg:"Generating keypair…" });
    try {
      const kp = generateKeypair();
      setStatus({ type:"info", msg:"Funding via Friendbot…" });
      await fundTestnet(kp.publicKey);
      setAccounts(p => [...p, { ...kp, label, source:"generated" }]);
      setStatus({ type:"success", msg:`"${label}" funded with 10,000 XLM ✓` });
      setLabel("");
    } catch(e) { setStatus({ type:"error", msg:e.message }); }
    setLoad(false);
  };

  const addFreighter = () => {
    if (!wallet.publicKey) return;
    if (accounts.find(a => a.publicKey === wallet.publicKey)) {
      setStatus({ type:"warn", msg:"Already added." }); return;
    }
    setAccounts(p => [...p, { publicKey:wallet.publicKey, secretKey:null, label:"Freighter Wallet", source:"freighter" }]);
    setStatus({ type:"success", msg:"Freighter account added!" });
  };

  const sk = k => k ? `${k.slice(0,8)}…${k.slice(-6)}` : "";

  return (
    <div className="fade-up">
      {/* stats row */}
      <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap" }}>
        <Pill label="Wallets" value={accounts.length} color={T.lime} />
        <Pill label="Network" value="TEST" color={T.cyan} />
        <Pill label="Free XLM" value="10K" color={T.orange} />
      </div>

      {/* generate */}
      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:22, marginBottom:16 }}>
        <SectionHead color={T.lime}>Generate Keypair</SectionHead>
        <p style={{ fontSize:11, color:T.muted, marginBottom:14, lineHeight:1.7 }}>
          Creates a new Stellar keypair and funds it with 10,000 XLM via Friendbot (testnet).
        </p>
        <Inp value={label} onChange={e=>setLabel(e.target.value)} placeholder='Name — e.g. "Ankit"'
          onKeyDown={e=>e.key==="Enter"&&create()} style={{ marginBottom:12 }} />
        <Btn onClick={create} disabled={loading}>
          {loading ? <span style={{display:"flex",alignItems:"center",gap:7}}><Spinner color="#000"/>Generating…</span> : "+ Generate & Fund"}
        </Btn>
      </div>

      {/* freighter */}
      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:22, marginBottom:16 }}>
        <SectionHead color={T.stellar}>Freighter Wallet</SectionHead>
        {wallet.connected ? (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:T.green, animation:"pulse 2s infinite" }} />
              <div>
                <div style={{ fontSize:12, color:T.text, fontWeight:500 }}>{sk(wallet.publicKey)}</div>
                <div style={{ fontSize:10, color:T.muted }}>{wallet.balance} XLM</div>
              </div>
            </div>
            <Btn color={T.stellar} onClick={addFreighter}>+ Use as Wallet</Btn>
          </div>
        ) : (
          <>
            <p style={{ fontSize:11, color:T.muted, marginBottom:14, lineHeight:1.7 }}>
              Connect your Freighter browser wallet for secure signing.{" "}
              <a href="https://freighter.app" target="_blank" rel="noreferrer">Install →</a>
            </p>
            <Btn color={T.stellar} outline onClick={wallet.connect} disabled={wallet.loading}>
              {wallet.loading ? <span style={{display:"flex",alignItems:"center",gap:7}}><Spinner color={T.stellar}/>Connecting…</span> : "Connect Freighter"}
            </Btn>
          </>
        )}
      </div>

      {status && <Status {...status} />}

      {/* accounts list */}
      {accounts.length > 0 && (
        <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:22, marginTop:16 }}>
          <SectionHead color={T.cyan}>Registered Wallets ({accounts.length})</SectionHead>
          {accounts.map((a,i) => (
            <div key={i} style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:10, padding:"12px 16px", marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:T.green }} />
                  <span style={{ fontFamily:"Syne,sans-serif", fontSize:13, fontWeight:700 }}>{a.label}</span>
                  <Badge color={a.source==="freighter"?T.stellar:T.lime}>{a.source==="freighter"?"Freighter":"Generated"}</Badge>
                </div>
                <Badge color={T.green}>Funded</Badge>
              </div>
              <div style={{ fontSize:10, color:T.muted, marginBottom:3 }}>Public Key</div>
              <div style={{ fontSize:10, color:T.stellar, background:T.bg, padding:"5px 10px", borderRadius:6, wordBreak:"break-all" }}>{a.publicKey}</div>
              {a.secretKey && (
                <div style={{ marginTop:8 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:3 }}>
                    <span style={{ fontSize:10, color:T.muted }}>Secret Key</span>
                    <button onClick={()=>setShow(p=>({...p,[i]:!p[i]}))}
                      style={{ fontSize:9, color:T.muted, background:"transparent", border:`1px solid ${T.border}`, borderRadius:4, padding:"1px 6px" }}>
                      {show[i]?"Hide":"Show"}
                    </button>
                    <span style={{ fontSize:9, color:T.red }}>⚠ Never share</span>
                  </div>
                  <div style={{ fontSize:10, color:T.yellow, background:T.bg, padding:"5px 10px", borderRadius:6,
                    wordBreak:"break-all", filter:show[i]?"none":"blur(5px)", userSelect:show[i]?"text":"none" }}>
                    {a.secretKey}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — Create Bill
// ═══════════════════════════════════════════════════════════════════════════════
const CATEGORIES = ["🍕 Food & Drinks","✈️ Travel","🏨 Hotel","🎉 Party","🛒 Shopping","💡 Utilities","🎬 Entertainment","Other"];

function CreateBillTab({ accounts, createBill }) {
  const [title,    setTitle]   = useState("");
  const [amount,   setAmount]  = useState("");
  const [category, setCat]     = useState(CATEGORIES[0]);
  const [paidByIdx,setPaid]    = useState("");
  const [members,  setMembers] = useState([{ name:"", publicKey:"" }]);
  const [status,   setStatus]  = useState(null);
  const [last,     setLast]    = useState(null);

  const addMember  = () => setMembers(p => [...p, { name:"", publicKey:"" }]);
  const remMember  = i  => setMembers(p => p.filter((_,j)=>j!==i));
  const setMember  = (i,k,v) => setMembers(p => p.map((m,j)=>j===i?{...m,[k]:v}:m));

  const fillFromAccount = (i, accIdx) => {
    if (accIdx === "") return;
    const a = accounts[parseInt(accIdx)];
    setMember(i, "name", a.label);
    setMember(i, "publicKey", a.publicKey);
  };

  const submit = () => {
    if (!title.trim())  { setStatus({ type:"warn", msg:"Enter a bill title." }); return; }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount)<=0)
                         { setStatus({ type:"warn", msg:"Enter a valid XLM amount." }); return; }
    if (paidByIdx === "") { setStatus({ type:"warn", msg:"Select who paid." }); return; }
    if (members.length < 2) { setStatus({ type:"warn", msg:"Add at least 2 members." }); return; }

    const filledMembers = members.filter(m=>m.name.trim()&&m.publicKey.trim());
    if (filledMembers.length < 2) {
      setStatus({ type:"warn", msg:"Fill name and wallet address for at least 2 members." });
      return;
    }

    const payer = accounts[parseInt(paidByIdx)];
    const bill  = createBill({
      title: `${category} – ${title}`,
      totalXLM: amount,
      paidBy: { name:payer.label, publicKey:payer.publicKey, secretKey:payer.secretKey, source:payer.source },
      members: filledMembers,
    });
    setLast(bill);
    setStatus({ type:"success", msg:`Bill created! Each person owes ${bill.share} XLM` });
    setTitle(""); setAmount(""); setMembers([{name:"",publicKey:""}]); setPaid("");
  };

  return (
    <div className="fade-up">
      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:24, marginBottom:16 }}>
        <SectionHead color={T.orange}>New Bill</SectionHead>

        {/* title + category */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
          <div>
            <label style={{ fontSize:10, color:T.muted, display:"block", marginBottom:5, letterSpacing:"0.1em" }}>BILL TITLE *</label>
            <Inp value={title} onChange={e=>setTitle(e.target.value)} placeholder='e.g. "Goa trip dinner"' />
          </div>
          <div>
            <label style={{ fontSize:10, color:T.muted, display:"block", marginBottom:5, letterSpacing:"0.1em" }}>CATEGORY</label>
            <Sel value={category} onChange={e=>setCat(e.target.value)}>
              {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
            </Sel>
          </div>
        </div>

        {/* amount + paid by */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:20 }}>
          <div>
            <label style={{ fontSize:10, color:T.muted, display:"block", marginBottom:5, letterSpacing:"0.1em" }}>TOTAL AMOUNT (XLM) *</label>
            <Inp type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="e.g. 120" min="0" step="0.01" />
          </div>
          <div>
            <label style={{ fontSize:10, color:T.muted, display:"block", marginBottom:5, letterSpacing:"0.1em" }}>PAID BY *</label>
            <Sel value={paidByIdx} onChange={e=>setPaid(e.target.value)}>
              <option value="">— who paid? —</option>
              {accounts.map((a,i)=><option key={i} value={i}>{a.label}</option>)}
            </Sel>
          </div>
        </div>

        {/* members */}
        <SectionHead color={T.cyan}>Split Between</SectionHead>
        {members.map((m,i) => (
          <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1.5fr auto", gap:10, marginBottom:10, alignItems:"center" }}>
            <Inp value={m.name} onChange={e=>setMember(i,"name",e.target.value)} placeholder={`Member ${i+1} name`} />
            <div style={{ display:"flex", gap:6 }}>
              <Inp value={m.publicKey} onChange={e=>setMember(i,"publicKey",e.target.value)} placeholder="G… (Stellar address)" style={{ flex:1 }} />
              {accounts.length > 0 && (
                <Sel style={{ width:"auto", padding:"10px 8px", fontSize:10 }}
                  onChange={e=>fillFromAccount(i, e.target.value)} defaultValue="">
                  <option value="">📋</option>
                  {accounts.map((a,j)=><option key={j} value={j}>{a.label}</option>)}
                </Sel>
              )}
            </div>
            {members.length > 1 && (
              <button onClick={()=>remMember(i)} style={{ background:"transparent", border:`1px solid ${T.border}`, borderRadius:6, padding:"8px 10px", color:T.red, fontSize:12 }}>✕</button>
            )}
          </div>
        ))}
        <button onClick={addMember}
          style={{ fontSize:11, color:T.cyan, background:"transparent", border:`1px dashed ${T.border2}`, borderRadius:8, padding:"8px 16px", marginBottom:20, width:"100%" }}>
          + Add Member
        </button>

        {/* preview */}
        {amount && members.filter(m=>m.name.trim() && m.publicKey.trim()).length > 0 && (
          <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:10, padding:"12px 16px", marginBottom:16, fontSize:11, color:T.muted }}>
            <span style={{ color:T.lime, fontWeight:600 }}>Split Preview: </span>
            {parseFloat(amount).toFixed(4)} XLM ÷ {members.filter(m=>m.name.trim() && m.publicKey.trim()).length} people
            = <span style={{ color:T.yellow }}>{(parseFloat(amount||0)/Math.max(members.filter(m=>m.name.trim() && m.publicKey.trim()).length,1)).toFixed(4)} XLM each</span>
            <span style={{ color:T.muted }}> (~${(parseFloat(amount||0)/Math.max(members.filter(m=>m.name.trim() && m.publicKey.trim()).length,1)*0.12).toFixed(2)} USD)</span>
          </div>
        )}

        <Btn color={T.orange} onClick={submit}>Create Bill →</Btn>
        {status && <Status {...status} />}
      </div>

      {/* last created */}
      {last && (
        <div style={{ background:T.card, border:`2px solid ${T.orange}44`, borderRadius:14, padding:22 }} className="fade-up">
          <SectionHead color={T.orange}>Bill Created</SectionHead>
          <ReceiptCard bill={last} mini />
        </div>
      )}
    </div>
  );
}

// ── ReceiptCard — renders a bill as a receipt ─────────────────────────────────
function ReceiptCard({ bill, mini=false }) {
  const settledCount = Object.keys(bill.settled).length;
  const total        = bill.members.length;
  const allDone      = settledCount >= total - 1;

  return (
    <div style={{
      background: "linear-gradient(160deg, #0D1526 0%, #111E38 100%)",
      border: `1px solid ${allDone ? T.green+"66" : T.border}`,
      borderTop: `3px solid ${allDone ? T.green : T.orange}`,
      borderRadius: 12, padding: mini ? "16px" : "20px",
      fontFamily: "DM Mono, monospace", position:"relative",
    }}>
      {/* receipt header */}
      <div style={{ textAlign:"center", marginBottom:12, paddingBottom:12, borderBottom:`1px dashed ${T.border2}` }}>
        <div style={{ fontFamily:"Syne,sans-serif", fontSize:mini?13:16, fontWeight:800, color:T.text }}>{bill.title}</div>
        <div style={{ fontSize:10, color:T.muted, marginTop:3 }}>{bill.id} · {bill.createdAt}</div>
      </div>

      {/* amount */}
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:11 }}>
        <span style={{ color:T.muted }}>Total</span>
        <span style={{ color:T.text, fontWeight:600 }}>{bill.totalXLM} XLM</span>
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:11 }}>
        <span style={{ color:T.muted }}>Paid by</span>
        <span style={{ color:T.cyan }}>{bill.paidBy.name}</span>
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12, fontSize:11 }}>
        <span style={{ color:T.muted }}>Each owes</span>
        <span style={{ color:T.lime, fontWeight:700 }}>{bill.share} XLM</span>
      </div>

      <hr className="dash" />

      {/* members */}
      {!mini && bill.members.map((m,i) => {
        const isPayer   = m.publicKey === bill.paidBy.publicKey;
        const isSettled = !!bill.settled[m.publicKey];
        return (
          <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8, fontSize:11 }}>
            <div style={{ display:"flex", alignItems:"center", gap:7 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background: isPayer ? T.cyan : isSettled ? T.green : T.orange }} />
              <span style={{ color: isPayer ? T.cyan : T.text }}>{m.name}</span>
              {isPayer && <Badge color={T.cyan}>Paid</Badge>}
            </div>
            {isPayer ? (
              <span style={{ color:T.muted, fontSize:10 }}>Payer</span>
            ) : isSettled ? (
              <Badge color={T.green}>✓ Settled</Badge>
            ) : (
              <span style={{ color:T.orange }}>{bill.share} XLM</span>
            )}
          </div>
        );
      })}

      {/* progress */}
      <div style={{ marginTop:12 }}>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:T.muted, marginBottom:4 }}>
          <span>Settlement progress</span>
          <span style={{ color: allDone ? T.green : T.text }}>{settledCount}/{total-1} settled</span>
        </div>
        <div style={{ background:T.border, borderRadius:10, height:4, overflow:"hidden" }}>
          <div style={{ height:"100%", borderRadius:10, width:`${total<=1?100:(settledCount/(total-1))*100}%`,
            background: allDone ? T.green : T.lime, transition:"width .4s ease" }} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — My Bills (settle on-chain)
// ═══════════════════════════════════════════════════════════════════════════════
function BillsTab({ bills, accounts, markSettled, deleteBill }) {
  const [settling, setSettling] = useState({}); // { `${billId}-${memberPK}`: bool }
  const [status,   setStatus]   = useState({});
  const [expanded, setExpanded] = useState({});

  const settle = async (bill, member) => {
    const key = `${bill.id}-${member.publicKey}`;

    // find the payer account (needs secretKey or freighter)
    // In real usage the MEMBER pays the PAYER back; member = debtor
    // We need the member's account to sign
    const memberAcc = accounts.find(a => a.publicKey === member.publicKey);
    if (!memberAcc) {
      setStatus(p=>({...p,[key]:{ type:"error", msg:`No account found for ${member.name}. Add their wallet in Wallets tab.` }}));
      return;
    }

    setSettling(p=>({...p,[key]:true}));
    setStatus(p=>({...p,[key]:{ type:"info", msg:"Broadcasting to Stellar testnet…" }}));

    try {
      const result = await settlePayment({
        senderPublicKey:   member.publicKey,
        senderSecretKey:   memberAcc.source==="freighter" ? null : memberAcc.secretKey,
        useFreighter:      memberAcc.source==="freighter",
        recipientPublicKey: bill.paidBy.publicKey,
        amountXLM:         bill.share,
        memo:              `SPLIT|${bill.title.slice(0,18)}`,
      });
      markSettled(bill.id, member.publicKey, result.txHash);
      setStatus(p=>({...p,[key]:{ type:"success", msg:`TX confirmed on ledger ${result.ledger} ✓` }}));
    } catch(e) {
      setStatus(p=>({...p,[key]:{ type:"error", msg:e.message }}));
    }
    setSettling(p=>({...p,[key]:false}));
  };

  if (bills.length === 0) return (
    <div className="fade-up" style={{ textAlign:"center", padding:"60px 20px" }}>
      <div style={{ fontFamily:"Syne,sans-serif", fontSize:48, marginBottom:12 }}>🧾</div>
      <div style={{ fontFamily:"Syne,sans-serif", fontSize:18, fontWeight:700, color:T.muted, marginBottom:8 }}>No bills yet</div>
      <div style={{ fontSize:12, color:T.muted }}>Create a bill in the Create tab to get started.</div>
    </div>
  );

  return (
    <div className="fade-up">
      {bills.map((bill, bi) => {
        const open = expanded[bill.id];
        return (
          <div key={bill.id} style={{ marginBottom:16 }} className="fade-up">
            {/* collapsed header */}
            <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, overflow:"hidden" }}>
              <div
                onClick={()=>setExpanded(p=>({...p,[bill.id]:!p[bill.id]}))}
                style={{ padding:"16px 20px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
                <div>
                  <div style={{ fontFamily:"Syne,sans-serif", fontSize:14, fontWeight:700 }}>{bill.title}</div>
                  <div style={{ fontSize:10, color:T.muted, marginTop:2 }}>{bill.createdAt} · {bill.members.length} people · {bill.totalXLM} XLM</div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <Badge color={Object.keys(bill.settled).length >= bill.members.length-1 ? T.green : T.orange}>
                    {Object.keys(bill.settled).length}/{bill.members.length-1} settled
                  </Badge>
                  <span style={{ color:T.muted, fontSize:14 }}>{open?"▲":"▼"}</span>
                </div>
              </div>

              {/* expanded detail */}
              {open && (
                <div style={{ borderTop:`1px solid ${T.border}`, padding:"16px 20px" }} className="fade-up">
                  <ReceiptCard bill={bill} />

                  {/* settle buttons */}
                  <div style={{ marginTop:16 }}>
                    <SectionHead color={T.lime}>Settle On-Chain</SectionHead>
                    {bill.members
                      .filter(m => m.publicKey !== bill.paidBy.publicKey)
                      .map((m, mi) => {
                        const key       = `${bill.id}-${m.publicKey}`;
                        const isSettled = !!bill.settled[m.publicKey];
                        const isLoading = settling[key];
                        const hasAcc    = !!accounts.find(a=>a.publicKey===m.publicKey);

                        return (
                          <div key={mi} style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:10, padding:"12px 16px", marginBottom:10 }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:status[key]?8:0 }}>
                              <div>
                                <div style={{ fontSize:13, fontWeight:600, color: isSettled?T.green:T.text }}>{m.name}</div>
                                <div style={{ fontSize:10, color:T.muted }}>{m.publicKey.slice(0,14)}… owes {bill.share} XLM</div>
                              </div>
                              {isSettled ? (
                                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                  <Badge color={T.green}>✓ Settled On-Chain</Badge>
                                  <a href={`https://stellar.expert/explorer/testnet/tx/${bill.settled[m.publicKey]}`}
                                    target="_blank" rel="noreferrer"
                                    style={{ fontSize:10, color:T.cyan }}>↗ TX</a>
                                </div>
                              ) : (
                                <Btn color={T.lime} onClick={()=>settle(bill,m)} disabled={isLoading||!hasAcc}
                                  style={{ fontSize:10, padding:"8px 14px" }}>
                                  {isLoading
                                    ? <span style={{display:"flex",alignItems:"center",gap:6}}><Spinner color="#000"/>Sending…</span>
                                    : hasAcc ? `Pay ${bill.share} XLM →` : "No wallet"}
                                </Btn>
                              )}
                            </div>
                            {status[key] && <Status {...status[key]} />}
                          </div>
                        );
                      })}
                  </div>

                  {/* delete */}
                  <div style={{ marginTop:12, textAlign:"right" }}>
                    <button onClick={()=>deleteBill(bill.id)}
                      style={{ fontSize:10, color:T.muted, background:"transparent", border:`1px solid ${T.border}`, borderRadius:6, padding:"5px 12px" }}>
                      Delete Bill
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 4 — Activity (on-chain settlements log)
// ═══════════════════════════════════════════════════════════════════════════════
function ActivityTab({ settlements, bills }) {
  const totalSettled = settlements.reduce((s,t) => {
    const bill = bills.find(b=>b.id===t.billId);
    return s + parseFloat(bill?.share||0);
  }, 0).toFixed(4);

  return (
    <div className="fade-up">
      <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap" }}>
        <Pill label="Tx Broadcast" value={settlements.length} color={T.green} />
        <Pill label="XLM Settled"  value={totalSettled}       color={T.lime} />
        <Pill label="Bills"        value={bills.length}       color={T.cyan} />
      </div>

      {settlements.length === 0 ? (
        <div style={{ textAlign:"center", padding:"50px 0" }}>
          <div style={{ fontSize:40, marginBottom:10 }}>⛓️</div>
          <div style={{ fontFamily:"Syne,sans-serif", fontSize:16, color:T.muted }}>No on-chain settlements yet</div>
          <div style={{ fontSize:11, color:T.muted, marginTop:6 }}>Settle a bill to see transactions here</div>
        </div>
      ) : (
        <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:22 }}>
          <SectionHead color={T.green}>On-Chain Settlements</SectionHead>
          {settlements.map((s,i) => {
            const bill = bills.find(b=>b.id===s.billId);
            const member = bill?.members.find(m=>m.publicKey===s.memberPublicKey);
            return (
              <div key={i} style={{ background:T.bg2, border:`1px solid ${T.border}`, borderLeft:`3px solid ${T.green}`,
                borderRadius:10, padding:"12px 16px", marginBottom:10 }} className="slide-in">
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:T.text }}>{member?.name || "Unknown"}</div>
                    <div style={{ fontSize:10, color:T.muted }}>{bill?.title}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:13, fontWeight:700, color:T.lime }}>{bill?.share} XLM</div>
                    <div style={{ fontSize:9, color:T.muted }}>{s.timestamp}</div>
                  </div>
                </div>
                <div style={{ fontSize:9, color:T.stellar, background:T.bg, padding:"5px 10px", borderRadius:6, wordBreak:"break-all", marginBottom:4 }}>
                  TX: {s.txHash}
                </div>
                <a href={`https://stellar.expert/explorer/testnet/tx/${s.txHash}`} target="_blank" rel="noreferrer"
                  style={{ fontSize:9, color:T.cyan }}>↗ View on Stellar Expert</a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT App
// ═══════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id:"wallets",  label:"Wallets",     color:T.lime   },
  { id:"create",   label:"New Bill",    color:T.orange },
  { id:"bills",    label:"My Bills",    color:T.cyan   },
  { id:"activity", label:"Activity",    color:T.green  },
];

export default function App() {
  const [tab, setTab]                   = useState("wallets");
  const [accounts, setAccounts]         = useState([]);
  const wallet                          = useWallet();
  const { bills, settlements, stats, createBill, markSettled, deleteBill } = useSplit();

  const active = TABS.find(t=>t.id===tab);

  return (
    <div style={{ minHeight:"100vh", background:T.bg }}>
      <style>{`
        @keyframes spin   { to { transform:rotate(360deg); } }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn{ from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
        .fade-up  { animation:fadeUp  .3s ease both; }
        .slide-in { animation:slideIn .25s ease both; }
      `}</style>

      {/* ── Topbar ─────────────────────────────────────────────────────────── */}
      <header style={{ background:T.surface, borderBottom:`1px solid ${T.border}`,
        padding:"0 28px", display:"flex", alignItems:"center", justifyContent:"space-between",
        height:56, position:"sticky", top:0, zIndex:100 }}>

        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, background:`linear-gradient(135deg,${T.lime},${T.cyan})`,
            borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:"Syne,sans-serif", fontWeight:800, fontSize:14, color:"#000" }}>S</div>
          <div>
            <div style={{ fontFamily:"Syne,sans-serif", fontWeight:800, fontSize:16, letterSpacing:"0.08em",
              background:`linear-gradient(90deg,${T.lime},${T.cyan})`,
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>StellarSplit</div>
            <div style={{ fontSize:9, color:T.muted, marginTop:-2 }}>Split bills on-chain</div>
          </div>
        </div>

        {/* Right */}
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {bills.length > 0 && <span style={{ fontSize:10, color:T.lime }}>{stats.pendingPayments} pending</span>}
          {wallet.connected ? (
            <div style={{ display:"flex", alignItems:"center", gap:7, background:T.card,
              border:`1px solid ${T.green}44`, borderRadius:20, padding:"5px 12px" }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:T.green, animation:"pulse 2s infinite" }} />
              <span style={{ fontSize:10, color:T.green }}>{wallet.publicKey.slice(0,6)}… · {wallet.balance} XLM</span>
              <button onClick={wallet.disconnect} style={{ background:"transparent", border:"none", color:T.muted, fontSize:10, padding:0 }}>✕</button>
            </div>
          ) : (
            <Btn color={T.stellar} outline onClick={wallet.connect} disabled={wallet.loading} style={{ padding:"6px 14px", fontSize:10 }}>
              {wallet.loading ? "Connecting…" : "Freighter"}
            </Btn>
          )}
          <div style={{ background:"#021A0A", border:`1px solid ${T.green}44`, color:T.green,
            borderRadius:20, padding:"4px 10px", fontSize:9, letterSpacing:"0.08em" }}>● TESTNET</div>
        </div>
      </header>

      {/* ── Ticker bar ──────────────────────────────────────────────────────── */}
      <div style={{ background:T.lime, height:28, overflow:"hidden", position:"relative" }}>
        <div style={{ position:"absolute", whiteSpace:"nowrap", display:"flex", alignItems:"center",
          height:"100%", animation:"ticker 22s linear infinite",
          fontFamily:"DM Mono,monospace", fontSize:10, fontWeight:500, color:"#000", gap:40 }}>
          {Array(4).fill(null).map((_,i) => (
            <span key={i} style={{ display:"flex", gap:40 }}>
              <span>⬡ STELLAR TESTNET</span>
              <span>⬡ FEE: 0.00001 XLM PER TX</span>
              <span>⬡ SETTLEMENT IN ~5 SECONDS</span>
              <span>⬡ NO BANKS · NO MIDDLEMEN</span>
              <span>⬡ POWERED BY STELLAR SDK</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Main layout ─────────────────────────────────────────────────────── */}
      <div style={{ maxWidth:1000, margin:"0 auto", padding:"28px 20px" }}>

        {/* hero */}
        <div style={{ marginBottom:28, paddingBottom:24, borderBottom:`1px solid ${T.border}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:16 }}>
            <div>
              <div style={{ fontSize:10, color:T.lime, letterSpacing:"0.2em", marginBottom:6 }}>STELLAR ECOSYSTEM PROJECT</div>
              <h1 style={{ fontFamily:"Syne,sans-serif", fontSize:32, fontWeight:800, lineHeight:1.1, marginBottom:8 }}>
                Split Bills.<br />
                <span style={{ color:T.lime }}>Settle On-Chain.</span>
              </h1>
              <p style={{ fontSize:12, color:T.muted, maxWidth:420, lineHeight:1.8 }}>
                No Venmo. No UPI delays. No trust issues. Every settlement is a real
                Stellar transaction — immutable, instant, and auditable forever.
              </p>
            </div>
            {/* stats */}
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <Pill label="Bills"    value={stats.totalBills}    color={T.orange} />
              <Pill label="Total XLM" value={stats.totalXLM}    color={T.lime} />
              <Pill label="TX Sent"   value={stats.settledTx}   color={T.green} />
            </div>
          </div>
        </div>

        {/* tabs */}
        <div style={{ display:"flex", gap:4, marginBottom:24, borderBottom:`1px solid ${T.border}` }}>
          {TABS.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              padding:"9px 18px", fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase",
              background: tab===t.id ? t.color : "transparent",
              color: tab===t.id ? (t.color===T.lime||t.color===T.yellow?"#000":"#fff") : T.muted,
              border:"none", borderRadius:"6px 6px 0 0", transition:"all .2s",
            }}>{t.label}</button>
          ))}
        </div>

        {/* content */}
        {tab==="wallets"  && <WalletsTab  accounts={accounts} setAccounts={setAccounts} wallet={wallet} />}
        {tab==="create"   && <CreateBillTab accounts={accounts} createBill={createBill} />}
        {tab==="bills"    && <BillsTab bills={bills} accounts={accounts} markSettled={markSettled} deleteBill={deleteBill} />}
        {tab==="activity" && <ActivityTab settlements={settlements} bills={bills} />}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop:`1px solid ${T.border}`, padding:"14px 28px",
        display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:9, color:T.muted, flexWrap:"wrap", gap:8 }}>
        <span>StellarSplit · On-chain bill splitting · Stellar Testnet · stellar-sdk + Freighter</span>
        <div style={{ display:"flex", gap:14 }}>
          {[["Stellar Docs","https://stellar.org/developers"],["Freighter","https://freighter.app"],
            ["Explorer","https://stellar.expert/explorer/testnet"]].map(([l,u])=>(
            <a key={l} href={u} target="_blank" rel="noreferrer" style={{ color:T.muted }}>{l}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}
