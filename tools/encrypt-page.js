#!/usr/bin/env node
// Encrypts an HTML page so it can be served from GitHub Pages and unlocked with a password in the browser.
// Usage: node tools/encrypt-page.js <input.html> <output.html> <password> [page title]
// The output contains only ciphertext plus a small unlock screen. Nothing from the input is readable without the password.
const fs = require('fs'); const { webcrypto } = require('crypto'); const subtle = webcrypto.subtle;
const [,, input, output, password, title='Private page'] = process.argv;
if (!input || !output || !password) { console.error('usage: encrypt-page.js <input.html> <output.html> <password> [title]'); process.exit(1); }
const ITER = 300000;
(async () => {
  const html = fs.readFileSync(input, 'utf8');
  const salt = webcrypto.getRandomValues(new Uint8Array(16)); const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const pw = password.trim().toUpperCase(); // not case sensitive: the unlock screen normalizes the same way
  const base = await subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  const key = await subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(html)));
  const b64 = b => Buffer.from(b).toString('base64');
  const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${title.replace(/</g,'&lt;')}</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root{--ink:#0B1F33;--steel:#1E3A5F;--azure:#2D6CDF;--mist:#F5F8FC;--line:#E2E8F0;--slate:#33475B;--slate-soft:#5B6B7C}
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(165deg,var(--steel) 0%,var(--ink) 70%);font-family:Inter,system-ui,sans-serif;color:var(--ink);padding:24px}
  .card{width:100%;max-width:420px;background:#fff;border-radius:18px;padding:32px 28px;box-shadow:0 30px 70px -30px rgba(0,0,0,.6)}
  .mark{width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#2D6CDF,#16B981);color:#fff;font:800 20px/52px Sora,sans-serif;text-align:center;margin-bottom:18px}
  h1{font:700 1.35rem Sora,sans-serif;margin:0 0 6px;letter-spacing:-.02em}
  p{margin:0 0 18px;color:var(--slate-soft);font-size:.95rem;line-height:1.55}
  label{display:block;font-size:.78rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--slate-soft);margin-bottom:6px}
  input{width:100%;font:inherit;font-size:16px;padding:13px 14px;border:1.5px solid var(--line);border-radius:11px;background:var(--mist);color:var(--ink)}
  input:focus{outline:none;border-color:var(--azure);background:#fff;box-shadow:0 0 0 4px rgba(45,108,223,.14)}
  button{width:100%;margin-top:12px;font:600 16px Sora,sans-serif;padding:14px;border:0;border-radius:11px;background:var(--azure);color:#fff;cursor:pointer}
  button[disabled]{opacity:.7;cursor:progress}
  .err{display:none;margin-top:12px;color:#B42318;font-size:.9rem}
  .foot{margin-top:18px;font-size:.8rem;color:var(--slate-soft);text-align:center}
  .foot a{color:var(--azure);text-decoration:none}
</style>
</head>
<body>
<form class="card" id="f" autocomplete="off">
  <div class="mark">SS</div>
  <h1>This page is private</h1>
  <p>Enter the password Sean shared with you to open the presentation.</p>
  <label for="pw">Password</label>
  <input id="pw" type="password" autocapitalize="characters" autocomplete="off" required>
  <button id="go" type="submit">Open</button>
  <div class="err" id="err">That password didn't match. Check it and try again.</div>
  <div class="foot">Not case sensitive · <a href="https://shvarzmanconsulting.com/">shvarzmanconsulting.com</a></div>
</form>
<script>
(function(){
  var SALT="${b64(salt)}", IV="${b64(iv)}", ITER=${ITER}, CT="${b64(ct)}";
  var f=document.getElementById('f'), pw=document.getElementById('pw'), go=document.getElementById('go'), err=document.getElementById('err');
  function b(s){var r=atob(s),u=new Uint8Array(r.length);for(var i=0;i<r.length;i++)u[i]=r.charCodeAt(i);return u;}
  async function unlock(p){
    var base=await crypto.subtle.importKey('raw',new TextEncoder().encode(p),'PBKDF2',false,['deriveKey']);
    var key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b(SALT),iterations:ITER,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['decrypt']);
    var plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:b(IV)},key,b(CT));
    return new TextDecoder().decode(plain);
  }
  f.addEventListener('submit',function(e){
    e.preventDefault(); err.style.display='none'; go.disabled=true; go.textContent='Opening…';
    var p=pw.value.trim().toUpperCase();
    unlock(p).then(function(html){ try{sessionStorage.setItem('ss-unlock',p);}catch(_){} document.open(); document.write(html); document.close(); })
      .catch(function(){ go.disabled=false; go.textContent='Open'; err.style.display='block'; pw.select(); });
  });
  try{ var saved=sessionStorage.getItem('ss-unlock'); if(saved){ unlock(saved).then(function(html){ document.open(); document.write(html); document.close(); }).catch(function(){}); } }catch(_){}
  if(!(window.crypto&&crypto.subtle)){ err.textContent='This browser cannot open the page. Please use a current browser over https.'; err.style.display='block'; go.disabled=true; }
})();
</script>
</body>
</html>
`;
  fs.writeFileSync(output, page);
  console.log('encrypted', input, '->', output, (fs.statSync(output).size/1024|0)+' KB');
})();
