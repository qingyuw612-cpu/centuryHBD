const ORIGINS = new Set(['https://www.centuryroom.cn', 'https://centuryroom.cn']);
const COOKIE = '__Host-century_session';
const encoder = new TextEncoder();
const random = () => [...crypto.getRandomValues(new Uint8Array(32))].map(v=>v.toString(16).padStart(2,'0')).join('');
const hex = a => [...new Uint8Array(a)].map(v=>v.toString(16).padStart(2,'0')).join('');
const hash = async s => hex(await crypto.subtle.digest('SHA-256', encoder.encode(s)));
export async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2', hash:'SHA-512', salt:encoder.encode(salt), iterations:100000}, key, 256));
}
const fail = (status, message) => { throw Object.assign(new Error(message), {status}); };
const publicUser = u => ({id:u.id, username:u.username, name:u.name, role:u.role, status:u.status});
export function validateSchedule(value) {
  if (!value || ![4,5,6].includes(value.count)) fail(400,'每日场次请选择 4、5 或 6 场');
  if (!Array.isArray(value.shows) || value.shows.length!==value.count) fail(400,'场次信息不完整');
  const drummers = ['汤世纪','yoyo','妹宝','小哲','Ben','阿诺','大象'];
  const shows = value.shows.map(s=>{
    if (!s || !['上午','下午'].includes(s.period) || !Array.isArray(s.drummers) || s.drummers.length!==2 || s.drummers.some(x=>!drummers.includes(x)) || s.drummers[0]===s.drummers[1]) fail(400,'每场需选择时段和两名不同的鼓手');
    return {period:s.period, drummers:s.drummers};
  });
  const groups = {MC:['欧修远','Curtis','Jason'], 舞者:['Gus','彭俊维'], 小号:['小河','小宏']};
  const roster = Object.entries(groups).flatMap(([group,names])=>names.map(name=>{
    const r = value.roster?.find(x=>x.group===group && x.name===name);
    if (!r || typeof r.shift!=='string' || r.shift.length>40) fail(400,'请填写各岗位安排（休息或待定也需注明）');
    return {group,name,shift:r.shift.trim()};
  }));
  if (roster.some(r=>!r.shift)) fail(400,'请填写各岗位安排');
  const special = drummers.map(name=>{
    const shift = value.special?.[name] || '';
    if (!['','休息','鬼屋'].includes(shift) || (shift==='鬼屋' && !['小哲','Ben'].includes(name))) fail(400,'鼓手特殊安排不正确');
    if (shift==='休息' && shows.some(s=>s.drummers.includes(name))) fail(400, name+'已安排演出，不能同时休息');
    return [name,shift];
  });
  if (typeof value.note!=='string' || value.note.length>1000) fail(400,'备注最长 1000 字');
  if (value.published!==true && value.published!==false) fail(400,'请选择草稿或发布');
  if(value.published && roster.some(r=>r.shift==='待定')) fail(400,'待定岗位请确认后再发布');
  return {count:value.count, shows, roster, special:Object.fromEntries(special), note:value.note.trim(), published:value.published};
}
async function body(request) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) fail(415,'请提交 JSON');
  const raw = await request.text();
  if (raw.length>16000) fail(413,'内容过长');
  try { return JSON.parse(raw); } catch { fail(400,'提交内容无法识别'); }
}
async function rate(env, key, max, seconds) {
  const window = Math.floor(Date.now()/1000/seconds);
  const r = await env.DB.prepare('INSERT INTO limits(key,window,hits) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN limits.window=excluded.window THEN limits.hits+1 ELSE 1 END, window=excluded.window RETURNING hits').bind(key,window).first();
  if(r.hits>max) fail(429,'操作过于频繁，请稍后再试');
}
async function user(request, env, need='session') {
  const cookie=request.headers.get('Cookie')||'';
  const token=cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  if(!token || !/^[a-f0-9]{64}$/.test(token)) fail(401,'请先登录');
  const u=await env.DB.prepare('SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?').bind(await hash(token),Date.now()).first();
  if(!u || u.status==='disabled') fail(401,'登录已失效，请重新登录');
  if(need!=='session' && u.status!=='approved') fail(403,'账号等待管理员批准');
  if(need==='admin' && u.role!=='admin') fail(403,'仅管理员可以操作');
  return u;
}
function dayValid(day) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(day)) || new Date(day).toISOString().slice(0,10)!==day) fail(400,'日期无效');
}
export default {
  async fetch(request, env) {
    const origin=request.headers.get('Origin');
    const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
    if(ORIGINS.has(origin)) Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Credentials':'true'});
    const respond=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{...headers,...extra}});
    try {
      if(origin && !ORIGINS.has(origin)) fail(403,'来源不受支持');
      if(request.method==='OPTIONS') return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, POST, PUT, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'}});
      const path=new URL(request.url).pathname, method=request.method;
      if(!['GET','POST','PUT'].includes(method)) fail(405,'请求方式不受支持');
      if(method!=='GET' && !ORIGINS.has(origin)) fail(403,'请从网站操作');
      if(method==='GET' && ['/', '/health'].includes(path)) {
        await env.DB.prepare('SELECT 1 AS connected').first();
        return respond({service:'centuryroom-api',status:'ok',database:'connected'});
      }
      if(path==='/auth/register' && method==='POST') {
        await rate(env,'register:'+await hash(request.headers.get('CF-Connecting-IP')||'unknown'),5,3600);
        const b=await body(request);
        if(typeof b.username!=='string' || !/^[a-zA-Z0-9_]{3,32}$/.test(b.username)) fail(400,'用户名需为 3–32 位英文字母、数字或下划线');
        if(typeof b.name!=='string' || !b.name.trim() || b.name.trim().length>40) fail(400,'姓名需为 1–40 字');
        if(typeof b.password!=='string' || b.password.length<15 || b.password.length>128) fail(400,'密码需为 15–128 个字符');
        const username=b.username.toLowerCase(), salt=random(), id=crypto.randomUUID();
        if(await env.DB.prepare('SELECT id FROM users WHERE username=?').bind(username).first()) fail(409,'用户名已被使用');
        const password_hash=await passwordHash(b.password,salt);
        try { await env.DB.prepare('INSERT INTO users(id,username,name,salt,password_hash,created_at) VALUES(?,?,?,?,?,?)').bind(id,username,b.name.trim(),salt,password_hash,Date.now()).run(); }
        catch(e) { if(String(e).includes('UNIQUE')) fail(409,'用户名已被使用'); throw e; }
        return respond({message:'注册成功，请登录并等待管理员批准'},201);
      }
      if(path==='/auth/login' && method==='POST') {
        await rate(env,'loginip:'+await hash(request.headers.get('CF-Connecting-IP')||'unknown'),30,900);
        const b=await body(request);
        if(typeof b.username!=='string' || typeof b.password!=='string' || b.password.length>128) fail(400,'请输入用户名和密码');
        const username=b.username.toLowerCase();
        await rate(env,'loginuser:'+await hash(username),10,900);
        const u=await env.DB.prepare('SELECT * FROM users WHERE username=?').bind(username).first();
        const actual=await passwordHash(b.password,u?.salt||'00000000000000000000000000000000');
        // Hash results have a fixed length; avoid early comparison exits.
        let difference=0; const expected=u?.password_hash||'0'.repeat(64);
        for(let i=0;i<64;i++) difference |= actual.charCodeAt(i)^expected.charCodeAt(i);
        if(!u || difference || u.status==='disabled') fail(401,'用户名或密码不正确，或账号已停用');
        const token=random();
        await env.DB.batch([
          env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(Date.now()),
          env.DB.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').bind(await hash(token),u.id,Date.now()+7*86400000)
        ]);
        return respond({user:publicUser(u)},200,{'Set-Cookie':`${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`});
      }
      if(path==='/auth/me' && method==='GET') return respond({user:publicUser(await user(request,env))});
      if(path==='/auth/logout' && method==='POST') {
        const cookie=request.headers.get('Cookie')||'';
        const token=cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
        if(token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await hash(token)).run();
        return respond({ok:true},200,{'Set-Cookie':`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`});
      }
      if(path==='/admin/users' && method==='GET') {
        await user(request,env,'admin');
        const r=await env.DB.prepare('SELECT id,username,name,role,status,created_at FROM users ORDER BY created_at DESC LIMIT 500').all();
        return respond({users:r.results});
      }
      if(path.startsWith('/admin/users/') && method==='PUT') {
        const actor=await user(request,env,'admin'), id=path.slice('/admin/users/'.length), b=await body(request);
        if(!['approved','disabled','pending'].includes(b.status)) fail(400,'状态无效');
        const target=await env.DB.prepare('SELECT id,role FROM users WHERE id=?').bind(id).first();
        if(!target) fail(404,'账号不存在');
        if(target.role==='admin') fail(400,'管理员账号需由站点负责人维护');
        await env.DB.batch([
          env.DB.prepare('UPDATE users SET status=? WHERE id=?').bind(b.status,id),
          env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(id),
          env.DB.prepare('INSERT INTO audit VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),actor.id,'user:'+b.status,id,Date.now())
        ]);
        return respond({ok:true});
      }
      if(path.startsWith('/schedules/') && method==='GET') {
        const u=await user(request,env,'approved'), day=path.slice('/schedules/'.length); dayValid(day);
        const r=await env.DB.prepare('SELECT * FROM schedules WHERE day=?').bind(day).first();
        if(!r || (!r.published && u.role!=='admin')) return respond({schedule:null});
        return respond({schedule:{day,data:JSON.parse(r.data),published:!!r.published,version:r.version,updatedAt:r.updated_at}});
      }
      if(path.startsWith('/schedules/') && method==='PUT') {
        const actor=await user(request,env,'admin'), day=path.slice('/schedules/'.length); dayValid(day);
        const b=await body(request), data=validateSchedule(b.data);
        if(!Number.isInteger(b.version) || b.version<0) fail(400,'请刷新排班后再保存');
        // Version-guarded writes prevent another administrator's update being overwritten.
        const update=b.version===0 ? env.DB.prepare('INSERT INTO schedules(day,data,published,version,updated_at,updated_by) VALUES(?,?,?,1,?,?) ON CONFLICT(day) DO NOTHING').bind(day,JSON.stringify(data),+data.published,Date.now(),actor.id) : env.DB.prepare('UPDATE schedules SET data=?,published=?,version=version+1,updated_at=?,updated_by=? WHERE day=? AND version=?').bind(JSON.stringify(data),+data.published,Date.now(),actor.id,day,b.version);
        const r=await update.run();
        if(!r.meta.changes) fail(409,'排班已被其他操作更新，请刷新后重试');
        await env.DB.prepare('INSERT INTO audit VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),actor.id,'schedule:'+ (data.published?'publish':'draft'),day,Date.now()).run();
        return respond({ok:true,version:b.version+1});
      }
      fail(404,'页面不存在');
    } catch(e) { return respond({message:e.status?e.message:'服务暂时不可用，请稍后重试'},e.status||503); }
  }
};
