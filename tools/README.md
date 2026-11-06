# tools/

## encrypt-page.js — password-protect a page on this static site

GitHub Pages cannot run server-side authentication, so a protected page is
published **encrypted**. The visitor types the password, the browser derives
the key and decrypts the page locally (WebCrypto), and the decrypted HTML
replaces the unlock screen. Without the password the published file contains
only ciphertext plus the branded unlock screen.

```
node tools/encrypt-page.js <input.html> <output.html> <password> [page title]
```

Example — republish the private deck after editing it (type the real
password in place of `YOUR-PASSWORD`; never write it into a file in this
repository):

```
node tools/encrypt-page.js ~/Downloads/deck.html \
  AAA/index.html YOUR-PASSWORD "Private presentation | Shvarzman Consulting"
git add AAA/index.html && git commit -m "Update private deck" && git push origin main
```

How it works

- Key derivation: PBKDF2-HMAC-SHA256, 300,000 iterations, random 16-byte salt.
- Encryption: AES-256-GCM with a random 12-byte IV (tamper-evident).
- Passwords are **not case sensitive**: both the tool and the unlock screen
  trim the input and upper-case it before deriving the key.
- A correct password is remembered for the browser session
  (`sessionStorage`), so a reload keeps the page open; closing the tab or
  browser locks it again. Nothing is stored on a server.
- The output page carries `noindex, nofollow` and must stay out of
  `sitemap.xml`.

Rules

- **Never commit the plaintext source.** Keep the unencrypted deck outside the
  repository (Downloads, Drive). Git history keeps every file ever committed,
  and this repository is public.
- **Never commit the password** either: not in a script, a note, or a commit
  message. Share it by phone or in person.
- To change the password, run the tool again with the new password and
  commit the new output.
- The protection keeps the content unreadable without the password. It does
  not stop someone who has the password from saving a copy, and a short,
  guessable password can be brute-forced offline by anyone who downloads the
  page. Use a longer passphrase for anything sensitive.
