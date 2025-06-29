// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBMUi291fwb-HSxlGPQMxdEJGUTiOOvFBs",
    authDomain: "nexaverse-eeb07.firebaseapp.com",
    projectId: "nexaverse-eeb07",
    storageBucket: "nexaverse-eeb07.appspot.com",
    messagingSenderId: "686342300627",
    appId: "1:686342300627:web:90522d8f1129fb00b08526",
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements
const authContainer = document.getElementById('authContainer');
const dashboardContainer = document.getElementById('dashboardContainer');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const githubLoginBtn = document.getElementById('githubLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginError = document.getElementById('loginError');
const registerError = document.getElementById('registerError');
const registerSuccess = document.getElementById('registerSuccess');
const currentHashDisplay = document.getElementById('currentHashDisplay');
const addHashBtn = document.getElementById('addHashBtn');
const hashesList = document.getElementById('hashesList');
const addHashModal = document.getElementById('addHashModal');
const closeAddHashModal = document.getElementById('closeAddHashModal');
const saveHashBtn = document.getElementById('saveHashBtn');
const hashInput = document.getElementById('hashInput');
const hashError = document.getElementById('hashError');

// Toggle between login and register forms
showRegister.addEventListener('click', () => {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    loginError.style.display = 'none';
});

showLogin.addEventListener('click', () => {
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
    registerError.style.display = 'none';
    registerSuccess.style.display = 'none';
});

// Login with email/password
loginBtn.addEventListener('click', () => {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showError(loginError, 'Please fill in all fields');
        return;
    }

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            loadUserData(userCredential.user.uid);
        })
        .catch((error) => {
            showError(loginError, error.message);
        });
});

// Register with email/password
registerBtn.addEventListener('click', () => {
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;

    if (!email || !password || !confirmPassword) {
        showError(registerError, 'Please fill in all fields');
        return;
    }

    if (password !== confirmPassword) {
        showError(registerError, 'Passwords do not match');
        return;
    }

    if (password.length < 6) {
        showError(registerError, 'Password should be at least 6 characters');
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Create user document in Firestore
            return db.collection('users').doc(userCredential.user.uid).set({
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => {
            registerError.style.display = 'none';
            registerSuccess.textContent = 'Registration successful! You can now login.';
            registerSuccess.style.display = 'block';
            document.getElementById('registerEmail').value = '';
            document.getElementById('registerPassword').value = '';
            document.getElementById('registerConfirmPassword').value = '';
            
            // Switch to login form after a delay
            setTimeout(() => {
                registerForm.style.display = 'none';
                loginForm.style.display = 'block';
                registerSuccess.style.display = 'none';
            }, 2000);
        })
        .catch((error) => {
            showError(registerError, error.message);
        });
});

// Login with GitHub
githubLoginBtn.addEventListener('click', () => {
    const provider = new firebase.auth.GithubAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            // Check if user exists in Firestore
            const userRef = db.collection('users').doc(result.user.uid);
            userRef.get().then((doc) => {
                if (!doc.exists) {
                    // Create user document if it doesn't exist
                    userRef.set({
                        email: result.user.email,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        githubUsername: result.additionalUserInfo.username
                    });
                }
                loadUserData(result.user.uid);
            });
        })
        .catch((error) => {
            showError(loginError, error.message);
        });
});

// Logout
logoutBtn.addEventListener('click', () => {
    auth.signOut().then(() => {
        dashboardContainer.style.display = 'none';
        authContainer.style.display = 'block';
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        loginError.style.display = 'none';
    });
});

// Add Hash Button
addHashBtn.addEventListener('click', () => {
    addHashModal.classList.add('show');
});

// Close Add Hash Modal
closeAddHashModal.addEventListener('click', () => {
    addHashModal.classList.remove('show');
    hashInput.value = '';
    hashError.style.display = 'none';
});

// Save Hash
saveHashBtn.addEventListener('click', () => {
    const hash = hashInput.value.trim();
    const userId = auth.currentUser.uid;

    if (!hash) {
        showError(hashError, 'Please enter a hash');
        return;
    }

    // Basic validation for SHA-256 hash (64 chars)
    if (hash.length !== 64 || !/^[a-fA-F0-9]+$/.test(hash)) {
        showError(hashError, 'Please enter a valid SHA-256 hash (64 hexadecimal characters)');
        return;
    }

    // Add hash to Firestore
    db.collection('users').doc(userId).collection('hashes').add({
        hash: hash,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        isUsed: false
    })
    .then(() => {
        hashInput.value = '';
        hashError.style.display = 'none';
        addHashModal.classList.remove('show');
        loadUserHashes(userId);
    })
    .catch((error) => {
        showError(hashError, error.message);
    });
});

// Auth state listener
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is signed in
        authContainer.style.display = 'none';
        dashboardContainer.style.display = 'block';
        loadUserData(user.uid);
    } else {
        // User is signed out
        dashboardContainer.style.display = 'none';
        authContainer.style.display = 'block';
    }
});

// Load user data
function loadUserData(userId) {
    // Load current used hash
    db.collection('users').doc(userId).collection('hashes')
        .where('isUsed', '==', true)
        .limit(1)
        .get()
        .then((querySnapshot) => {
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                currentHashDisplay.querySelector('.hash-text').textContent = doc.data().hash;
            } else {
                currentHashDisplay.querySelector('.hash-text').textContent = 'No hash selected';
                currentHashDisplay.classList.remove('hash-active');
                currentHashDisplay.querySelector('.hash-status').textContent = 'INACTIVE';
                currentHashDisplay.querySelector('.hash-status').className = 'hash-status status-inactive';
            }
        });

    // Load all hashes
    loadUserHashes(userId);
}

// Load user hashes
function loadUserHashes(userId) {
    hashesList.innerHTML = '';
    
    db.collection('users').doc(userId).collection('hashes')
        .orderBy('createdAt', 'desc')
        .get()
        .then((querySnapshot) => {
            if (querySnapshot.empty) {
                hashesList.innerHTML = '<p>No hashes found. Add your first hash!</p>';
                addHashBtn.innerHTML = '<i class="fas fa-plus"></i> Add Hash';
            } else {
                addHashBtn.innerHTML = '<i class="fas fa-plus"></i> Add Another Hash';
                
                querySnapshot.forEach((doc) => {
                    const hashData = doc.data();
                    const hashItem = document.createElement('div');
                    hashItem.className = 'hash-item';
                    hashItem.dataset.id = doc.id;
                    
                    if (hashData.isUsed) {
                        hashItem.classList.add('hash-active');
                    }
                    
                    hashItem.innerHTML = `
                        <div class="hash-icon">
                            <i class="fas fa-file-code"></i>
                        </div>
                        <div class="hash-content">${hashData.hash}</div>
                        <div class="hash-actions">
                            <button class="hash-dropdown-btn">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div class="hash-dropdown">
                                <div class="hash-dropdown-item" data-action="use">Use Hash</div>
                                <div class="hash-dropdown-item" data-action="delete">Delete</div>
                            </div>
                        </div>
                    `;
                    
                    hashesList.appendChild(hashItem);
                    
                    // Add event listeners for dropdown
                    const dropdownBtn = hashItem.querySelector('.hash-dropdown-btn');
                    const dropdown = hashItem.querySelector('.hash-dropdown');
                    
                    dropdownBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        document.querySelectorAll('.hash-dropdown').forEach(d => {
                            if (d !== dropdown) d.classList.remove('show');
                        });
                        dropdown.classList.toggle('show');
                    });
                    
                    // Handle dropdown actions
                    dropdown.querySelectorAll('.hash-dropdown-item').forEach(item => {
                        item.addEventListener('click', (e) => {
                            e.stopPropagation();
                            dropdown.classList.remove('show');
                            
                            if (item.dataset.action === 'use') {
                                useHash(userId, doc.id, hashData.hash);
                            } else if (item.dataset.action === 'delete') {
                                deleteHash(userId, doc.id);
                            }
                        });
                    });
                });
            }
        });
}

// Use hash
function useHash(userId, hashId, hashValue) {
    // First, set all hashes to isUsed = false
    db.collection('users').doc(userId).collection('hashes')
        .where('isUsed', '==', true)
        .get()
        .then((querySnapshot) => {
            const batch = db.batch();
            querySnapshot.forEach((doc) => {
                batch.update(doc.ref, { isUsed: false });
            });
            return batch.commit();
        })
        .then(() => {
            // Then set the selected hash to isUsed = true
            return db.collection('users').doc(userId).collection('hashes').doc(hashId).update({
                isUsed: true
            });
        })
        .then(() => {
            // Update UI
            currentHashDisplay.querySelector('.hash-text').textContent = hashValue;
            currentHashDisplay.classList.add('hash-active');
            currentHashDisplay.querySelector('.hash-status').textContent = 'ACTIVE';
            currentHashDisplay.querySelector('.hash-status').className = 'hash-status status-active';
            
            // Reload hashes to update their status in the list
            loadUserHashes(userId);
        })
        .catch((error) => {
            console.error('Error updating hash:', error);
        });
}

// Delete hash
function deleteHash(userId, hashId) {
    if (confirm('Are you sure you want to delete this hash?')) {
        db.collection('users').doc(userId).collection('hashes').doc(hashId).delete()
            .then(() => {
                loadUserHashes(userId);
                
                // Check if the deleted hash was the active one
                const currentHashText = currentHashDisplay.querySelector('.hash-text').textContent;
                db.collection('users').doc(userId).collection('hashes')
                    .where('hash', '==', currentHashText)
                    .limit(1)
                    .get()
                    .then((querySnapshot) => {
                        if (querySnapshot.empty) {
                            currentHashDisplay.querySelector('.hash-text').textContent = 'No hash selected';
                            currentHashDisplay.classList.remove('hash-active');
                            currentHashDisplay.querySelector('.hash-status').textContent = 'INACTIVE';
                            currentHashDisplay.querySelector('.hash-status').className = 'hash-status status-inactive';
                        }
                    });
            })
            .catch((error) => {
                console.error('Error deleting hash:', error);
            });
    }
}

// Helper function to show errors
function showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

// Close dropdowns when clicking outside
document.addEventListener('click', () => {
    document.querySelectorAll('.hash-dropdown').forEach(dropdown => {
        dropdown.classList.remove('show');
    });
});

// Close modal when clicking outside
addHashModal.addEventListener('click', (e) => {
    if (e.target === addHashModal) {
        addHashModal.classList.remove('show');
        hashInput.value = '';
        hashError.style.display = 'none';
    }
});
