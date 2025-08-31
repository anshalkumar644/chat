import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, onSnapshot, updateDoc, arrayUnion, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { v4 as uuidv4 } from 'https://cdn.jsdelivr.net/npm/uuid@8.3.2/dist/esm-browser/index.js';
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";

// ** Firebase Configuration **
// Isse run karne ke liye, yahan apni asli Firebase credentials daalein.
const firebaseConfig = {
    apiKey: "AIzaSyCcpeDw-4NxOiMpcGKugmLgoPbkUAaTfkc",
    authDomain: "friend-38298.firebaseapp.com",
    projectId: "friend-38298",
    storageBucket: "friend-38298.firebasestorage.app",
    messagingSenderId: "1066199210284",
    appId: "1:1066199210284:web:854718a4c53faccc99f489",
    measurementId: "G-3XBD4XKKX9"
};

// Global variables for Firebase
const appId = 'default-app-id'; // This value is now dynamic and set from the config
const initialAuthToken = null; // Canvas environment ke liye

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
let currentUserData = null;
let currentFriendData = null;
let unsubscribeFromChat = null; // for real-time listener

// UI Elements
const loadingView = document.getElementById('loading-view');
const loginView = document.getElementById('login-view');
const otpView = document.getElementById('otp-view');
const mainAppView = document.getElementById('main-app-view');
const chatView = document.getElementById('chat-view');
const loginPhoneInput = document.getElementById('login-phone');
const sendOtpBtn = document.getElementById('send-otp-btn');
const otpInput = document.getElementById('otp-input');
const verifyOtpBtn = document.getElementById('verify-otp-btn');
const loginMessage = document.getElementById('login-message');
const otpMessage = document.getElementById('otp-message');
const logoutBtn = document.getElementById('logout-btn');
const currentUsernameEl = document.getElementById('current-username');
const profilePhotoEl = document.getElementById('profile-photo');
const profileNameInput = document.getElementById('profile-name');
const profileStatusInput = document.getElementById('profile-status');
const profilePhotoUrlInput = document.getElementById('profile-photo-url');
const saveProfileBtn = document.getElementById('save-profile-btn');
const profileMessage = document.getElementById('profile-message');
const friendPhoneInput = document.getElementById('friend-phone-input');
const addFriendBtn = document.getElementById('add-friend-btn');
const friendsMessage = document.getElementById('friends-message');
const friendsListEl = document.getElementById('friends-list');
const chatsListEl = document.getElementById('chats-list');
const tabLinks = document.querySelectorAll('.tab-link');
const tabContents = document.querySelectorAll('.tab-content');
const toastEl = document.getElementById('toast');
const backToChatsBtn = document.getElementById('back-to-chats-btn');
const chatFriendPhotoEl = document.getElementById('chat-friend-photo');
const chatFriendNameEl = document.getElementById('chat-friend-name');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendMessageBtn = document.getElementById('send-message-btn');

// Show/hide functions for different pages
function showView(viewId) {
    const views = [loadingView, loginView, otpView, mainAppView, chatView];
    views.forEach(view => {
        if (view.id === viewId) {
            view.classList.remove('hidden');
        } else {
            view.classList.add('hidden');
        }
    });
}

// Show toast messages
function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.remove('hidden');
    setTimeout(() => {
        toastEl.classList.add('hidden');
    }, 3000);
}

const phoneRegex = /^\+91\d{10}$/;

// OTP Handling (Simulated)
let simulatedOtpSent = false;
sendOtpBtn.addEventListener('click', () => {
    const phone = loginPhoneInput.value;
    if (!phoneRegex.test(phone)) {
        loginMessage.textContent = 'Sahi mobile number daalein (e.g., +919876543210).';
        return;
    }
    simulatedOtpSent = true;
    showView('otp-view');
    otpMessage.textContent = 'OTP bheja gaya hai. `123456` daalein.';
});

verifyOtpBtn.addEventListener('click', async () => {
    const phone = loginPhoneInput.value;
    const otp = otpInput.value;
    if (otp === '123456') { // Simulated OTP
        await handleAuthentication(phone);
    } else {
        otpMessage.textContent = 'Galat OTP. Kripya dobara koshish karein.';
    }
});

// Firebase Authentication and User Data Management
async function handleAuthentication(phoneNumber) {
    otpMessage.textContent = 'User ko authenticate kar rahe hain...';
    try {
        let userRef;
        
        // Use anonymous auth as a stand-in for custom token auth
        await signInAnonymously(auth);
        const uid = auth.currentUser.uid;
        
        // Check if user exists with this phone number
        const usersRef = collection(db, 'artifacts', appId, 'users');
        const q = query(usersRef, where('phoneNumber', '==', phoneNumber));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            // Register new user
            userRef = doc(db, 'artifacts', appId, 'users', uid);
            const newUserData = {
                uid,
                phoneNumber,
                username: `User-${uid.slice(0, 5)}`,
                photoURL: '',
                about: 'Hey there! I am using this app.',
                friends: []
            };
            await setDoc(userRef, newUserData);
            currentUserData = newUserData;
            showToast('Naya user register ho gaya!');
        } else {
            // Log in existing user by updating auth token
            const userDocSnap = querySnapshot.docs[0];
            const existingUserUid = userDocSnap.id;
            currentUserData = userDocSnap.data();
            showToast('Login safal raha!');
        }
        
        setupMainAppUI();
        
    } catch (error) {
        console.error("Authentication failed:", error);
        otpMessage.textContent = 'Authentication mein samasya: ' + error.message;
    }
}

async function setupMainAppUI() {
    showView('main-app-view');
    currentUsernameEl.textContent = `Hello, ${currentUserData.username}`;
    updateProfileUI(currentUserData);
    fetchFriends();
    // Default to profile tab
    document.querySelector('[data-tab="profile"]').classList.add('border-green-500', 'text-green-500');
    document.getElementById('profile-tab').classList.remove('hidden');
}

// Logout
logoutBtn.addEventListener('click', async () => {
    await auth.signOut();
    currentUserData = null;
    if (unsubscribeFromChat) {
        unsubscribeFromChat();
    }
    showView('login-view');
    loginPhoneInput.value = '+91';
    otpInput.value = '';
    loginMessage.textContent = '';
    showToast('Aap logout ho gaye hain.');
});

// Profile Management
function updateProfileUI(user) {
    profileNameInput.value = user.username || '';
    profileStatusInput.value = user.about || '';
    profilePhotoUrlInput.value = user.photoURL || '';
    profilePhotoEl.src = user.photoURL || 'https://placehold.co/128x128/9CA3AF/FFFFFF?text=Photo';
}

saveProfileBtn.addEventListener('click', async () => {
    if (!currentUserData) return;
    const newName = profileNameInput.value;
    const newStatus = profileStatusInput.value;
    const newPhotoUrl = profilePhotoUrlInput.value;

    const userRef = doc(db, 'artifacts', appId, 'users', currentUserData.uid);
    await setDoc(userRef, {
        username: newName,
        about: newStatus,
        photoURL: newPhotoUrl
    }, { merge: true });

    currentUserData.username = newName;
    currentUserData.about = newStatus;
    currentUserData.photoURL = newPhotoUrl;
    
    updateProfileUI(currentUserData);
    currentUsernameEl.textContent = `Hello, ${currentUserData.username}`;
    showToast('Profile save ho gaya!');
});

// Friends Management
addFriendBtn.addEventListener('click', async () => {
    const friendPhone = friendPhoneInput.value;
    if (!phoneRegex.test(friendPhone)) {
        friendsMessage.textContent = 'Sahi mobile number daalein (e.g., +919876543210).';
        return;
    }
    if (friendPhone === currentUserData.phoneNumber) {
        friendsMessage.textContent = 'Aap khud ko dost ke roop mein add nahi kar sakte!';
        return;
    }
    if (currentUserData.friends.includes(friendPhone)) {
         friendsMessage.textContent = 'Yeh dost pehle se hi add hai.';
         return;
    }

    // Check if friend exists in Firestore
    const usersRef = collection(db, 'artifacts', appId, 'users');
    const q = query(usersRef, where('phoneNumber', '==', friendPhone));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        friendsMessage.textContent = 'Mobile number se koi user nahi mila.';
        return;
    }

    // Add friend to the current user's list
    const userRef = doc(db, 'artifacts', appId, 'users', currentUserData.uid);
    currentUserData.friends.push(friendPhone);
    await setDoc(userRef, { friends: currentUserData.friends }, { merge: true });
    friendsMessage.textContent = 'Dost add ho gaya!';
    friendPhoneInput.value = '+91';
    fetchFriends();
});

async function fetchFriends() {
    friendsListEl.innerHTML = '';
    chatsListEl.innerHTML = '';
    if (!currentUserData.friends || currentUserData.friends.length === 0) {
        const noFriendsMsg = `<li class="p-4 text-center text-gray-500">Abhi tak koi dost nahi hai.</li>`;
        friendsListEl.innerHTML = noFriendsMsg;
        chatsListEl.innerHTML = noFriendsMsg;
        return;
    }
    
    const usersRef = collection(db, 'artifacts', appId, 'users');
    const q = query(usersRef, where('phoneNumber', 'in', currentUserData.friends));
    const querySnapshot = await getDocs(q);
    
    querySnapshot.forEach(doc => {
        const friend = doc.data();
        
        // Add to friends list tab
        const friendLi = document.createElement('li');
        friendLi.classList.add('p-3', 'bg-gray-50', 'rounded-md', 'flex', 'items-center', 'space-x-4');
        friendLi.innerHTML = `
            <img src="${friend.photoURL || 'https://placehold.co/48x48/9CA3AF/FFFFFF?text=Photo'}" alt="Photo" class="w-12 h-12 rounded-full object-cover">
            <div>
                <p class="font-semibold text-gray-800">${friend.username}</p>
                <p class="text-sm text-gray-500">${friend.about}</p>
            </div>
        `;
        friendsListEl.appendChild(friendLi);

        // Add to chats list tab (and make it clickable)
        const chatLi = document.createElement('li');
        chatLi.classList.add('p-4', 'bg-gray-100', 'rounded-md', 'flex', 'items-center', 'space-x-4', 'cursor-pointer', 'hover:bg-gray-200', 'transition-colors');
        chatLi.setAttribute('data-friend-uid', friend.uid);
        chatLi.innerHTML = `
            <img src="${friend.photoURL || 'https://placehold.co/48x48/9CA3AF/FFFFFF?text=Photo'}" alt="Photo" class="w-12 h-12 rounded-full object-cover">
            <div class="flex-grow">
                <p class="font-semibold text-gray-800">${friend.username}</p>
                <p class="text-sm text-gray-500">Naya chat shuru karein...</p>
            </div>
        `;
        chatLi.addEventListener('click', () => openChat(friend));
        chatsListEl.appendChild(chatLi);
    });
}

// Tab Navigation
tabLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        tabLinks.forEach(l => l.classList.remove('border-green-500', 'text-green-500'));
        link.classList.add('border-green-500', 'text-green-500');
        
        tabContents.forEach(content => content.classList.add('hidden'));
        const targetTab = document.getElementById(link.dataset.tab + '-tab');
        targetTab.classList.remove('hidden');
    });
});

// Chat View Functions
function getChatId(user1Uid, user2Uid) {
    const uids = [user1Uid, user2Uid].sort();
    return uids.join('_');
}

function openChat(friend) {
    currentFriendData = friend;
    showView('chat-view');
    chatFriendNameEl.textContent = friend.username;
    chatFriendPhotoEl.src = friend.photoURL || 'https://placehold.co/48x48/9CA3AF/FFFFFF?text=Photo';
    messagesContainer.innerHTML = ''; // Clear old messages

    // Unsubscribe from previous chat listener if it exists
    if (unsubscribeFromChat) {
        unsubscribeFromChat();
    }

    const chatId = getChatId(currentUserData.uid, currentFriendData.uid);
    const chatRef = doc(db, 'artifacts', appId, 'public', 'data', 'groups', chatId);

    // Set up real-time listener for messages
    unsubscribeFromChat = onSnapshot(chatRef, (docSnap) => {
        messagesContainer.innerHTML = ''; // Clear messages to re-render
        if (docSnap.exists()) {
            const messages = docSnap.data().messages;
            if (messages && messages.length > 0) {
                messages.forEach(msg => {
                    renderMessage(msg, currentUserData.uid);
                });
                messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll to bottom
            }
        }
    });
}

function renderMessage(message, currentUid) {
    const messageEl = document.createElement('div');
    const isSentByMe = message.senderId === currentUid;
    messageEl.classList.add('flex', isSentByMe ? 'justify-end' : 'justify-start');

    messageEl.innerHTML = `
        <div class="max-w-[75%] p-2 rounded-lg ${isSentByMe ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-800'}">
            <p class="text-sm">${message.text}</p>
            <p class="text-[10px] text-right mt-1 opacity-75">${message.timestamp ? new Date(message.timestamp.toDate()).toLocaleTimeString() : ''}</p>
        </div>
    `;
    messagesContainer.appendChild(messageEl);
}

async function sendMessage() {
    const text = messageInput.value.trim();
    if (text === '' || !currentUserData || !currentFriendData) {
        return;
    }
    
    const chatId = getChatId(currentUserData.uid, currentFriendData.uid);
    const chatRef = doc(db, 'artifacts', appId, 'public', 'data', 'groups', chatId);

    try {
        const chatDoc = await getDoc(chatRef);
        if (!chatDoc.exists()) {
             await setDoc(chatRef, { messages: [] });
        }

        await updateDoc(chatRef, {
            messages: arrayUnion({
                text: text,
                senderId: currentUserData.uid,
                timestamp: serverTimestamp()
            })
        });

        messageInput.value = ''; // Clear input field
    } catch (error) {
        console.error("Error sending message:", error);
        showToast("Message bhej nahi paaya. Dobara koshish karein.");
    }
}

// Event Listeners for Chat View
sendMessageBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

backToChatsBtn.addEventListener('click', () => {
    showView('main-app-view');
    // Stop listening to messages to save resources
    if (unsubscribeFromChat) {
        unsubscribeFromChat();
    }
    // Switch back to chats tab
    document.querySelector('[data-tab="chat-list"]').click();
});

// Initialize authentication and app
async function initializeAuthAndApp() {
    showView('loading-view');
    try {
        // Listen to auth state changes to handle login/logout
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userRef = doc(db, 'artifacts', appId, 'users', user.uid);
                const docSnap = await getDoc(userRef);
                
                if (docSnap.exists()) {
                    currentUserData = docSnap.data();
                    setupMainAppUI();
                } else {
                    // This user doesn't exist in Firestore, maybe a login from another session, force logout.
                    await auth.signOut();
                    showView('login-view');
                }
            } else {
                // No authenticated user, show login page.
                showView('login-view');
            }
        });
    } catch (error) {
        console.error("Initial auth check failed:", error);
        showView('login-view');
    }
}

initializeAuthAndApp();
