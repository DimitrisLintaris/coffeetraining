// ----------------------------------------------------------------------
// 1. Ρύθμιση Firebase (Με τα δικά σας Config Keys)
// ----------------------------------------------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyD6gU8AbSwRCvvHnEHonCaABRAOaQe3VOw",
    authDomain: "training-registration-app.firebaseapp.com",
    databaseURL: "https://training-registration-app-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "training-registration-app",
    storageBucket: "training-registration-app.firebasestorage.app",
    messagingSenderId: "513473485221",
    appId: "1:513473485221:web:5f8ffd9e47079ad617304c",
    measurementId: "G-XY1W0MQ6XW"
};
firebase.initializeApp(firebaseConfig);

const db = firebase.database();
const sectionsRef = db.ref('sections');
const registrationsRef = db.ref('registrations');

// Ορίζουμε τα κλειδιά των τμημάτων
const sectionKeys = ['class_a', 'class_b', 'class_c', 'class_d', 'class_e', 'class_f'];
const CAPACITY = 5; // Μέγιστη χωρητικότητα ανά τμήμα

// ----------------------------------------------------------------------
// A. Λογική Real-Time Ενημέρωσης (onValue Listener)
// ----------------------------------------------------------------------
sectionsRef.on('value', (snapshot) => {
    const sections = snapshot.val();
    
    sectionKeys.forEach(key => {
        const section = sections && sections[key];
        const statusEl = document.getElementById(`status-${key}`);
        const optionEl = document.querySelector(`option[value="${key}"]`);
        
        // Ενημέρωση της κατάστασης
        if (statusEl) {
            const count = (section && section.registered_count) ? section.registered_count : 0;
            const isFull = count >= CAPACITY;
            const sectionName = key.toUpperCase().replace('CLASS_', 'ΤΜΗΜΑ ');
            
            statusEl.innerHTML = `${sectionName}: ${count}/${CAPACITY} | ${isFull ? '🚫 ΠΛΗΡΕΣ' : ' Διαθέσιμο'}`;
            
            // Αλλαγή κλάσης CSS για χρώμα
            statusEl.classList.toggle('full', isFull);
            statusEl.classList.toggle('available', !isFull);
            
            // Απενεργοποίηση της επιλογής στη φόρμα
            if (optionEl) {
                optionEl.disabled = isFull;
            }
        }
    });
});

// ----------------------------------------------------------------------
// B. Λογική Υποβολής Φόρμας (Transaction)
// ----------------------------------------------------------------------
document.getElementById('registration-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Συλλογή όλων των δεδομένων από τη φόρμα (Χρήση firstName/lastName)
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const phone = document.getElementById('phone').value;       
    const email = document.getElementById('email').value;       
    const store = document.getElementById('store').value;       
    const jobTitle = document.getElementById('job-title').value;
    const sectionId = document.getElementById('section-select').value;
    
    const messageEl = document.getElementById('message');
    const submitBtn = document.getElementById('submit-button');

    if (!sectionId) {
        messageEl.textContent = 'Παρακαλώ επιλέξτε ένα τμήμα.';
        messageEl.classList.add('error');
        return;
    }

    submitBtn.disabled = true;
    messageEl.textContent = 'Επεξεργασία εγγραφής...';
    messageEl.classList.remove('error');

    // Transaction για ασφαλή αύξηση του counter
    db.ref('sections/' + sectionId).transaction((section) => {
        // Εάν το section δεν υπάρχει ή δεν είναι πλήρες
        if (!section) {
            // Δημιουργία αρχικής δομής εάν δεν υπάρχει
            section = { capacity: CAPACITY, registered_count: 0, is_full: false };
        }
        
        if (section.registered_count < section.capacity) {
            section.registered_count += 1;
            section.is_full = section.registered_count >= section.capacity;
            return section;
        } else {
             // Το τμήμα είναι πλήρες
             return; 
        }
    }, (error, committed, snapshot) => {
        submitBtn.disabled = false;
        
        if (error) {
            messageEl.textContent = '❌ Σφάλμα δικτύου ή βάσης δεδομένων. Δοκιμάστε ξανά.';
            messageEl.classList.add('error');
        } else if (committed) {
            // Επιτυχής κράτηση: Αποθήκευση λεπτομερειών χρήστη
            registrationsRef.push({
                firstName: firstName, 
                lastName: lastName,   
                phone: phone,      
                email: email,      
                store: store,      
                jobTitle: jobTitle,
                section: sectionId,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            
            messageEl.textContent = `✅ Συγχαρητήρια! Εγγραφήκατε στο ${sectionId.toUpperCase().replace('CLASS_', 'ΤΜΗΜΑ ')}.`;
            messageEl.classList.remove('error');
            document.getElementById('registration-form').reset();
        } else {
            // Transaction ακυρώθηκε
            messageEl.textContent = '❌ Αποτυχία: Το τμήμα είναι πλέον πλήρες.';
            messageEl.classList.add('error');
        }
    });

});

