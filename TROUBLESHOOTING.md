# 🔧 Οδηγός Αντιμετώπισης Προβλημάτων

## Το site φαίνεται καλά αλλά δεν φορτώνει δεδομένα

### Βήμα 1: Ελέγξτε το Console
1. Ανοίξτε το Developer Tools (F12 ή Right Click → Inspect)
2. Πηγαίνετε στο tab "Console"
3. Κάντε κλικ στο κουμπί "🚀 Ανάκτηση Δεδομένων"
4. Δείτε τι errors εμφανίζονται

### Συχνά Errors:

#### ❌ CORS Error
```
Access to fetch at 'https://evstats.gr/api/...' has been blocked by CORS policy
```
**Λύση**: Το app χρησιμοποιεί CORS proxy. Αν δεν δουλεύει, δοκιμάστε:
- Αλλάξτε το proxy στο `app.js` (δείτε παρακάτω)
- Περιμένετε λίγα λεπτά - μερικές φορές τα proxies έχουν rate limits

#### ❌ Network Error
```
Failed to fetch
```
**Λύση**: 
- Ελέγξτε τη σύνδεσή σας στο internet
- Δοκιμάστε να φορτώσετε το evstats.gr απευθείας - μπορεί να είναι down

#### ❌ 429 Too Many Requests
```
HTTP 429
```
**Λύση**: Περιμένετε 1-2 λεπτά και δοκιμάστε ξανά

### Βήμα 2: Αλλάξτε το CORS Proxy

Ανοίξτε το `app.js` και αλλάξτε την πρώτη γραμμή μετά το "Configuration":

**Option 1: allOrigins (default)**
```javascript
const CORS_PROXY = "https://api.allorigins.win/raw?url=";
```

**Option 2: corsproxy.io**
```javascript
const CORS_PROXY = "https://corsproxy.io/?";
```

**Option 3: cors.sh**
```javascript
const CORS_PROXY = "https://cors.sh/";
```

### Βήμα 3: Test το API απευθείας

Ανοίξτε αυτό το link στον browser:
```
https://api.allorigins.win/raw?url=https://evstats.gr/api/dailyBevModels/2025-04-20
```

Αν δείτε JSON δεδομένα, το API δουλεύει!

### Βήμα 4: Clear Cache

1. Ctrl+Shift+R (Windows) ή Cmd+Shift+R (Mac)
2. Ή: Developer Tools → Network tab → Disable cache checkbox

## Η Streamlit εφαρμογή δουλεύει αλλά η GitHub Pages όχι

Αυτό είναι φυσιολογικό! Το Streamlit τρέχει στο backend (Python server) και δεν έχει CORS issues. 

Το GitHub Pages είναι στατικό site (frontend only) και χρειάζεται CORS proxy.

## Debugging Tips

### Console Logs
Το app κάνει console.log σε κάθε API call. Δείτε:
```
✓ Fetched data for 2025-04-20: {v2: {...}}
```

### Network Tab
1. Developer Tools → Network tab
2. Κάντε κλικ "Fetch data"
3. Δείτε τα requests - πρέπει να δείτε calls στο CORS proxy
4. Κλικ σε κάθε request για να δείτε το response

### Test μόνο το JavaScript
Ανοίξτε το Console και τρέξτε:
```javascript
fetch('https://api.allorigins.win/raw?url=https://evstats.gr/api/dailyBevModels/2025-04-20')
  .then(r => r.json())
  .then(d => console.log('SUCCESS:', d))
  .catch(e => console.error('ERROR:', e));
```

Αν δείτε `SUCCESS:` με δεδομένα, το proxy δουλεύει!

## Εναλλακτική Λύση: Backend Proxy

Αν κανένα public CORS proxy δεν δουλεύει, μπορείτε να φτιάξετε το δικό σας:

### Χρησιμοποιώντας Cloudflare Workers (Free)

1. Δημιουργήστε account στο cloudflare.com
2. Workers → Create a Service
3. Paste αυτό το code:

```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const apiUrl = url.searchParams.get('url')
  
  if (!apiUrl) {
    return new Response('Missing url parameter', { status: 400 })
  }
  
  const response = await fetch(apiUrl)
  const newResponse = new Response(response.body, response)
  
  newResponse.headers.set('Access-Control-Allow-Origin', '*')
  newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  
  return newResponse
}
```

4. Deploy
5. Αλλάξτε στο app.js:
```javascript
const CORS_PROXY = "https://your-worker.your-subdomain.workers.dev/?url=";
```

## Ακόμα δεν δουλεύει;

1. Στείλτε μου screenshot από το Console με τα errors
2. Στείλτε μου το GitHub Pages URL
3. Πες μου ποιο browser χρησιμοποιείς

## Χρήσιμα Links

- [Streamlit App (working)](https://evstats.streamlit.app/)
- [evstats.gr API](https://evstats.gr)
- [allOrigins CORS Proxy](https://allorigins.win/)
- [GitHub Pages Docs](https://docs.github.com/pages)
