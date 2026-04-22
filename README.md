# EVStats Dashboard 🚗⚡

Διαδραστική εφαρμογή για την παρακολούθηση στατιστικών ηλεκτρικών οχημάτων στην Ελλάδα.

## 🌟 Χαρακτηριστικά

- **Ημερήσια Δεδομένα**: Προβολή ημερήσιων ταξινομήσεων ηλεκτρικών οχημάτων ανά μοντέλο
- **Μηνιαία Σύνοψη**: Συγκεντρωτικά στατιστικά για κάθε μήνα
- **Μετρικές Κατασκευαστών**: Ανάλυση πωλήσεων ανά κατασκευαστή (μηνιαία, τριμηνιαία, ετήσια)
- **Responsive Design**: Λειτουργεί άψογα σε όλες τις συσκευές
- **Modern UI**: Σύγχρονη διεπαφή με animations και gradient effects

## 🚀 Live Demo

Δείτε την εφαρμογή σε λειτουργία: [https://yourusername.github.io/evstats-dashboard/](https://yourusername.github.io/evstats-dashboard/)

## 📊 Πηγή Δεδομένων

Όλα τα δεδομένα προέρχονται από το [evstats.gr](https://evstats.gr) μέσω του public API τους.

## 🛠️ Τεχνολογίες

- **HTML5**: Semantic markup
- **CSS3**: Custom properties, Grid, Flexbox, Animations
- **Vanilla JavaScript**: Fetch API, Async/Await
- **Google Fonts**: Unbounded & DM Sans

## 📦 Εγκατάσταση στο GitHub Pages

### Βήμα 1: Δημιουργήστε νέο Repository

1. Πηγαίνετε στο GitHub και δημιουργήστε νέο repository
2. Ονομάστε το `evstats-dashboard` (ή όπως θέλετε)
3. Κάντε το public

### Βήμα 2: Ανεβάστε τα αρχεία

Κάντε clone το repository και ανεβάστε τα αρχεία:

```bash
git clone https://github.com/yourusername/evstats-dashboard.git
cd evstats-dashboard

# Αντιγράψτε τα αρχεία: index.html, styles.css, app.js

git add .
git commit -m "Initial commit: EVStats Dashboard"
git push origin main
```

### Βήμα 3: Ενεργοποιήστε το GitHub Pages

1. Πηγαίνετε στο repository στο GitHub
2. Κλικ στο **Settings**
3. Στο αριστερό μενού, κλικ στο **Pages**
4. Στο **Source**, επιλέξτε **main** branch
5. Κλικ **Save**

Σε λίγα λεπτά, το site σας θα είναι διαθέσιμο στο:
```
https://yourusername.github.io/evstats-dashboard/
```

## 📁 Δομή Αρχείων

```
evstats-dashboard/
│
├── index.html          # Κύριο HTML αρχείο
├── styles.css          # Όλα τα styles
├── app.js              # JavaScript λογική & API calls
└── README.md           # Αυτό το αρχείο
```

## 🎨 Προσαρμογή

### Αλλαγή Χρωμάτων

Επεξεργαστείτε το `styles.css` και αλλάξτε τις CSS variables στο `:root`:

```css
:root {
    --primary: #00E5FF;        /* Κύριο χρώμα */
    --accent: #FF6B35;         /* Accent χρώμα */
    --bg-dark: #0A0E27;        /* Background */
    /* ... */
}
```

### Προσθήκη Κατασκευαστών

Επεξεργαστείτε το `app.js` και προσθέστε στον πίνακα `MAKERS`:

```javascript
const MAKERS = [
    "total", "byd", "tesla", "volvo", "hyundai", 
    "geely", "leapmotor", "volkswagen", "bmw", 
    "changan deepal", "your-new-maker"
];
```

## 🔧 Ανάπτυξη (Local Development)

Για να τρέξετε την εφαρμογή τοπικά:

1. Κατεβάστε τα αρχεία
2. Ανοίξτε την εφαρμογή με έναν local server (π.χ. Live Server στο VS Code)
3. Ή απλά ανοίξτε το `index.html` στον browser (μπορεί να έχετε CORS issues)

**Σημείωση για CORS**: Για local development χωρίς server, μπορεί να χρειαστεί να απενεργοποιήσετε το CORS στον browser ή να χρησιμοποιήσετε extension όπως το "CORS Unblock".

## 📱 Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers

## 🐛 Γνωστά Προβλήματα

- Το API του evstats.gr μπορεί να είναι αργό σε peak ώρες
- Ορισμένα παλιά δεδομένα μπορεί να μην είναι διαθέσιμα

## 🤝 Συνεισφορά

Contributions are welcome! Feel free to:

1. Fork το repository
2. Δημιουργήστε το feature branch σας (`git checkout -b feature/AmazingFeature`)
3. Commit τις αλλαγές σας (`git commit -m 'Add some AmazingFeature'`)
4. Push στο branch (`git push origin feature/AmazingFeature`)
5. Ανοίξτε ένα Pull Request

## 📄 License

Αυτό το project είναι ελεύθερο για προσωπική και εκπαιδευτική χρήση.

## 📞 Επικοινωνία

Για ερωτήσεις ή προτάσεις, ανοίξτε ένα issue στο GitHub.

---

**Δημιουργήθηκε με ⚡ για την Ελληνική EV κοινότητα**
