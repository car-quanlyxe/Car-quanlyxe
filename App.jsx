import { useEffect, useMemo, useState } from "react";
import {
  CarFront, CalendarDays, Users, Wrench, Wallet, LayoutDashboard,
  LogOut, Plus, RefreshCw, Search, Trash2, AlertCircle, X
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

const NAV = [
  ["dashboard", "Tổng quan", LayoutDashboard],
  ["bookings", "Lịch thuê xe", CalendarDays],
  ["cars", "Danh sách xe", CarFront],
  ["customers", "Khách hàng", Users],
  ["maintenance", "Bảo dưỡng", Wrench],
  ["transactions", "Thu chi", Wallet],
];

const CONFIG = {
  cars: {
    title: "Danh sách xe", table: "cars",
    fields: [
      ["name", "Tên xe", "text", true], ["plate", "Biển số", "text", true],
      ["daily_rate", "Giá thuê/ngày (VNĐ)", "number", true],
      ["status", "Trạng thái", "select", true, ["available", "maintenance", "inactive"]],
      ["notes", "Ghi chú", "textarea"]
    ],
    columns: [["name","Tên xe"],["plate","Biển số"],["daily_rate","Giá/ngày"],["status","Trạng thái"]]
  },
  customers: {
    title: "Khách hàng", table: "customers",
    fields: [
      ["full_name", "Họ tên", "text", true], ["phone", "Số điện thoại", "text", true],
      ["email", "Email", "email"], ["notes", "Ghi chú", "textarea"]
    ],
    columns: [["full_name","Họ tên"],["phone","Điện thoại"],["email","Email"]]
  },
  bookings: {
    title: "Lịch thuê xe", table: "bookings",
    fields: [
      ["car_id", "Xe", "car", true], ["customer_id", "Khách hàng", "customer", true],
      ["pickup_at", "Ngày giờ nhận xe", "datetime-local", true],
      ["return_at", "Ngày giờ trả xe", "datetime-local", true],
      ["status", "Trạng thái", "select", true, ["pending","confirmed","completed","cancelled"]],
      ["total_amount", "Tổng tiền (VNĐ)", "number", true],
      ["deposit_amount", "Tiền cọc (VNĐ)", "number"],
      ["paid_amount", "Đã thanh toán (VNĐ)", "number"],
      ["notes", "Ghi chú", "textarea"]
    ],
    columns: [["car_name","Xe"],["customer_name","Khách hàng"],["pickup_at","Nhận xe"],["return_at","Trả xe"],["status","Trạng thái"],["total_amount","Tổng tiền"]]
  },
  maintenance: {
    title: "Bảo dưỡng", table: "maintenance",
    fields: [
      ["car_id", "Xe", "car", true], ["service_date", "Ngày bảo dưỡng", "date", true],
      ["description", "Nội dung", "text", true], ["cost", "Chi phí (VNĐ)", "number"],
      ["next_due_date", "Ngày bảo dưỡng tiếp theo", "date"], ["notes", "Ghi chú", "textarea"]
    ],
    columns: [["car_name","Xe"],["service_date","Ngày"],["description","Nội dung"],["cost","Chi phí"],["next_due_date","Lần tiếp theo"]]
  },
  transactions: {
    title: "Thu chi", table: "transactions",
    fields: [
      ["kind", "Loại", "select", true, ["income","expense"]],
      ["transaction_date", "Ngày", "date", true],
      ["category", "Danh mục", "text", true],
      ["amount", "Số tiền (VNĐ)", "number", true],
      ["description", "Diễn giải", "text"],
      ["booking_id", "Mã đặt xe (nếu có)", "text"]
    ],
    columns: [["transaction_date","Ngày"],["kind","Loại"],["category","Danh mục"],["amount","Số tiền"],["description","Diễn giải"]]
  }
};

const money = (v) => Number(v || 0).toLocaleString("vi-VN") + " đ";
const dateText = (v) => v ? new Date(v).toLocaleString("vi-VN", { dateStyle:"short", timeStyle: v.includes("T") ? "short" : undefined }) : "—";
const statusText = (s) => ({
  available:"Sẵn sàng", maintenance:"Đang bảo dưỡng", inactive:"Ngừng khai thác",
  pending:"Chờ xác nhận", confirmed:"Đã xác nhận", completed:"Hoàn thành",
  cancelled:"Đã hủy", income:"Thu", expense:"Chi"
}[s] || s || "—");

function Login({ onLogin }) {
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("Không đăng nhập được. Kiểm tra email/mật khẩu hoặc tài khoản Supabase.");
    setBusy(false);
  }
  return <div className="login-wrap"><form className="login-card" onSubmit={submit}>
    <div className="brand-mark"><CarFront size={30}/></div><p className="eyebrow">QUẢN LÝ CHO THUÊ XE TỰ LÁI</p>
    <h1>CAR RENTAL</h1><p className="muted">Đăng nhập vào không gian quản lý của bạn.</p>
    <label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} /></label>
    <label>Mật khẩu<input type="password" required value={password} onChange={e=>setPassword(e.target.value)} /></label>
    {error && <p className="error">{error}</p>}
    <button className="primary full" disabled={busy}>{busy ? "Đang đăng nhập…" : "Đăng nhập"}</button>
    <small>Tài khoản do quản trị viên tạo trong Supabase. Không có chức năng tự đăng ký công khai.</small>
  </form></div>;
}

function App() {
  const [session,setSession] = useState(null);
  const [page,setPage] = useState("dashboard");
  const [data,setData] = useState({cars:[],customers:[],bookings:[],maintenance:[],transactions:[]});
  const [loading,setLoading] = useState(false);
  const [notice,setNotice] = useState("");
  const [query,setQuery] = useState("");
  const [modal,setModal] = useState(false);
  const [editing,setEditing] = useState(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({data})=>setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event,s)=>setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadAll() {
    if (!session) return;
    setLoading(true);
    const tables = ["cars","customers","bookings","maintenance","transactions"];
    const results = await Promise.all(tables.map(t=>supabase.from(t).select("*").order("created_at",{ascending:false})));
    const next = {};
    results.forEach((r,i)=>{ next[tables[i]] = r.error ? [] : (r.data || []); });
    const carMap = Object.fromEntries((next.cars||[]).map(x=>[x.id,x.name+" · "+x.plate]));
    const customerMap = Object.fromEntries((next.customers||[]).map(x=>[x.id,x.full_name]));
    next.bookings = (next.bookings||[]).map(x=>({...x,car_name:carMap[x.car_id]||"Xe đã xóa",customer_name:customerMap[x.customer_id]||"Khách đã xóa"}));
    next.maintenance = (next.maintenance||[]).map(x=>({...x,car_name:carMap[x.car_id]||"Xe đã xóa"}));
    setData(next); setLoading(false);
  }
  useEffect(()=>{loadAll();},[session]);

  async function saveRecord(values) {
    const table = CONFIG[page].table;
    const payload = {...values, owner_id:session.user.id};
    if (payload.booking_id === "") payload.booking_id = null;
    ["daily_rate","total_amount","deposit_amount","paid_amount","cost","amount"].forEach(k=>{
      if (payload[k] !== undefined && payload[k] !== "") payload[k] = Number(payload[k]);
    });
    if (page === "bookings") {
      if (new Date(payload.return_at) <= new Date(payload.pickup_at)) {
        setNotice("Thời điểm trả xe phải sau thời điểm nhận xe."); return;
      }
      payload.pickup_at = new Date(payload.pickup_at).toISOString();
      payload.return_at = new Date(payload.return_at).toISOString();
    }
    const result = editing
      ? await supabase.from(table).update(payload).eq("id",editing.id)
      : await supabase.from(table).insert(payload);
    if (result.error) {
      setNotice(result.error.code === "23P01"
        ? "Xe đã có lịch thuê trùng thời gian. Hãy chọn khung giờ khác."
        : "Không lưu được dữ liệu: " + result.error.message);
      return;
    }
    setModal(false); setEditing(null); setNotice("Đã lưu dữ liệu."); await loadAll();
  }

  async function removeRecord(row) {
    if (!confirm("Bạn chắc chắn muốn xóa mục này?")) return;
    const {error} = await supabase.from(CONFIG[page].table).delete().eq("id",row.id);
    setNotice(error ? "Không xóa được: "+error.message : "Đã xóa mục.");
    await loadAll();
  }

  const totals = useMemo(()=>{
    const income = data.transactions.filter(x=>x.kind==="income").reduce((s,x)=>s+Number(x.amount||0),0);
    const expense = data.transactions.filter(x=>x.kind==="expense").reduce((s,x)=>s+Number(x.amount||0),0);
    const receivable = data.bookings.reduce((s,x)=>s+Math.max(0,Number(x.total_amount||0)-Number(x.paid_amount||0)),0);
    return {income,expense,profit:income-expense,receivable};
  },[data]);

  if (!isSupabaseConfigured) return <div className="setup-screen"><div className="setup-card">
    <div className="brand-mark"><CarFront size={30}/></div><h1>CAR RENTAL</h1>
    <h2>Chưa kết nối cơ sở dữ liệu</h2>
    <p>Hãy tạo dự án Supabase, chạy tệp <code>supabase/schema.sql</code>, sau đó tạo tệp <code>.env</code> từ <code>.env.example</code> và điền URL cùng publishable/anon key.</p>
    <p className="muted">Hướng dẫn đầy đủ nằm trong <code>README_VI.md</code>.</p>
  </div></div>;
  if (!session) return <Login />;

  const cfg = CONFIG[page];
  const rows = cfg ? (data[cfg.table]||[]) : [];
  const filtered = rows.filter(r=>JSON.stringify(r).toLowerCase().includes(query.toLowerCase()));

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="side-brand"><div className="brand-mark small"><CarFront/></div><div><b>CAR RENTAL</b><small>QUẢN LÝ ĐỘI XE</small></div></div>
      <nav>{NAV.map(([id,label,Icon])=><button key={id} className={page===id?"nav-item active":"nav-item"} onClick={()=>{setPage(id);setQuery("");}}><Icon size={18}/>{label}</button>)}</nav>
      <div className="side-bottom"><small>{session.user.email}</small><button className="nav-item" onClick={()=>supabase.auth.signOut()}><LogOut size={18}/>Đăng xuất</button></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><p className="eyebrow">KHÔNG GIAN QUẢN LÝ</p><h1>{page==="dashboard"?"Tổng quan":cfg.title}</h1></div>
        <button className="icon-button" onClick={loadAll} title="Tải lại"><RefreshCw size={18}/></button></header>
      {notice && <div className="notice"><AlertCircle size={17}/>{notice}<button onClick={()=>setNotice("")}><X size={16}/></button></div>}
      {page==="dashboard" ? <Dashboard data={data} totals={totals} setPage={setPage}/> :
        <section className="panel">
          <div className="panel-head"><div><h2>{cfg.title}</h2><p className="muted">{rows.length} mục dữ liệu</p></div>
            <div className="actions"><div className="search"><Search size={16}/><input placeholder="Tìm kiếm…" value={query} onChange={e=>setQuery(e.target.value)}/></div>
              <button className="primary" onClick={()=>{setEditing(null);setModal(true);}}><Plus size={17}/> Thêm mới</button></div></div>
          {loading ? <p className="empty">Đang tải dữ liệu…</p> : <div className="table-wrap"><table><thead><tr>{cfg.columns.map(([k,label])=><th key={k}>{label}</th>)}<th></th></tr></thead>
            <tbody>{filtered.map(row=><tr key={row.id}>{cfg.columns.map(([k])=><td key={k}>{renderCell(k,row[k])}</td>)}<td className="row-actions"><button title="Sửa" onClick={()=>{setEditing(row);setModal(true);}}>Sửa</button><button title="Xóa" onClick={()=>removeRecord(row)}><Trash2 size={15}/></button></td></tr>)}
              {!filtered.length && <tr><td colSpan={cfg.columns.length+1} className="empty">Chưa có dữ liệu. Hãy thêm mục đầu tiên.</td></tr>}</tbody></table></div>}
        </section>}
    </main>
    {modal && <RecordModal page={page} config={cfg} initial={editing} data={data} onClose={()=>{setModal(false);setEditing(null);}} onSave={saveRecord}/>}
  </div>;
}

function renderCell(key,value) {
  if (["daily_rate","total_amount","deposit_amount","paid_amount","cost","amount"].includes(key)) return money(value);
  if (["pickup_at","return_at","service_date","next_due_date","transaction_date"].includes(key)) return dateText(value);
  if (["status","kind"].includes(key)) return <span className={"pill "+value}>{statusText(value)}</span>;
  return value || "—";
}

function Dashboard({data,totals,setPage}) {
  const today = new Date().toISOString().slice(0,10);
  const todayBookings = data.bookings.filter(b=>b.pickup_at?.slice(0,10)===today || b.return_at?.slice(0,10)===today);
  const activeCars = data.cars.filter(c=>c.status==="available").length;
  return <div className="dashboard">
    <div className="stat-grid">
      <Stat label="Tổng số xe" value={data.cars.length} icon={<CarFront/>}/>
      <Stat label="Xe sẵn sàng" value={activeCars} icon={<CarFront/>}/>
      <Stat label="Lịch nhận/trả hôm nay" value={todayBookings.length} icon={<CalendarDays/>}/>
      <Stat label="Công nợ còn lại" value={money(totals.receivable)} icon={<Wallet/>}/>
    </div>
    <div className="stat-grid finance">
      <Stat label="Tổng thu đã ghi nhận" value={money(totals.income)} icon={<Wallet/>}/>
      <Stat label="Tổng chi đã ghi nhận" value={money(totals.expense)} icon={<Wallet/>}/>
      <Stat label="Chênh lệch thu - chi" value={money(totals.profit)} icon={<Wallet/>}/>
    </div>
    <div className="two-col">
      <section className="panel"><div className="panel-head"><div><h2>Lịch nhận/trả hôm nay</h2><p className="muted">Các lượt có ngày nhận hoặc trả là hôm nay</p></div><button className="text-button" onClick={()=>setPage("bookings")}>Xem lịch</button></div>
        {todayBookings.length ? todayBookings.map(b=><div className="mini-row" key={b.id}><div><b>{b.car_name}</b><small>{b.customer_name}</small></div><span>{dateText(b.pickup_at)} → {dateText(b.return_at)}</span></div>) : <p className="empty">Chưa có lịch nhận/trả hôm nay.</p>}
      </section>
      <section className="panel"><div className="panel-head"><div><h2>Nhắc việc bảo dưỡng</h2><p className="muted">Các lịch đến hạn trong 14 ngày tới</p></div><button className="text-button" onClick={()=>setPage("maintenance")}>Xem</button></div>
        {data.maintenance.filter(m=>m.next_due_date && m.next_due_date<=new Date(Date.now()+14*86400000).toISOString().slice(0,10)).slice(0,5).map(m=><div className="mini-row" key={m.id}><div><b>{m.car_name}</b><small>{m.description}</small></div><span>{dateText(m.next_due_date)}</span></div>)}
        {!data.maintenance.some(m=>m.next_due_date && m.next_due_date<=new Date(Date.now()+14*86400000).toISOString().slice(0,10)) && <p className="empty">Chưa có lịch bảo dưỡng sắp đến hạn.</p>}
      </section>
    </div>
    <p className="footnote">Báo cáo thu/chi dựa trên các giao dịch đã nhập tại mục Thu chi. Đây là số liệu quản lý, chưa thay thế sổ sách kế toán chính thức.</p>
  </div>;
}
function Stat({label,value,icon}) { return <div className="stat-card"><div><small>{label}</small><strong>{value}</strong></div><span className="stat-icon">{icon}</span></div>; }

function RecordModal({page,config,initial,data,onClose,onSave}) {
  const [values,setValues] = useState(()=>{
    const obj={};
    config.fields.forEach(([key,,type])=>{
      let v=initial?.[key] ?? "";
      if(type==="datetime-local" && v) v=new Date(v).toISOString().slice(0,16);
      obj[key]=v;
    });
    return obj;
  });
  const [busy,setBusy]=useState(false);
  async function submit(e){e.preventDefault();setBusy(true);await onSave(values);setBusy(false);}
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><form className="modal" onSubmit={submit}>
    <div className="modal-head"><div><p className="eyebrow">CAR RENTAL</p><h2>{initial?"Cập nhật":"Thêm"} {config.title.toLowerCase()}</h2></div><button type="button" className="icon-button" onClick={onClose}><X/></button></div>
    <div className="form-grid">{config.fields.map(([key,label,type,required,options])=>{
      let input;
      if(type==="textarea") input=<textarea rows="3" value={values[key]} onChange={e=>setValues({...values,[key]:e.target.value})}/>;
      else if(type==="select") input=<select required={required} value={values[key]} onChange={e=>setValues({...values,[key]:e.target.value})}><option value="">-- Chọn --</option>{options.map(o=><option key={o} value={o}>{statusText(o)}</option>)}</select>;
      else if(type==="car" || type==="customer") {
        const opts=type==="car"?data.cars:data.customers;
        input=<select required={required} value={values[key]} onChange={e=>setValues({...values,[key]:e.target.value})}><option value="">-- Chọn --</option>{opts.map(o=><option key={o.id} value={o.id}>{type==="car"?o.name+" · "+o.plate:o.full_name}</option>)}</select>;
      } else input=<input type={type} required={required} min={type==="number"?"0":undefined} step={type==="number"?"1":undefined} value={values[key]} onChange={e=>setValues({...values,[key]:e.target.value})}/>;
      return <label className={type==="textarea"?"wide":""} key={key}>{label}{required&&" *"}{input}</label>;
    })}</div>
    <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Hủy</button><button className="primary" disabled={busy}>{busy?"Đang lưu…":"Lưu dữ liệu"}</button></div>
  </form></div>;
}

export default App;
