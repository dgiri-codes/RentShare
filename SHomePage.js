import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR API_KEY",
  authDomain: "YOUR AUTH_DOMAIN",
  projectId: "YOUR PROJECT_ID",
  storageBucket: "YOUR STORAGE_BUCKET",
  messagingSenderId: "YOUR MESSAGING_SENDER_ID",
  appId: "YOUR APP_ID"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let notices = [];
let currentOfferId = null;
let currentUser = null;

const allowedEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function isAllowedEmail(email) {
  return allowedEmailRegex.test(email.trim());
}

function isAuthenticatedStudent() {
  return (
    currentUser &&
    currentUser.email &&
    currentUser.emailVerified &&
    isAllowedEmail(currentUser.email)
  );
}

async function authenticateUser() {
  if (isAuthenticatedStudent()) {
    return true;
  }

  const emailInput = document.querySelector('#TNeed input[type="email"]');

  if (!emailInput) {
    alert("Email field not found.");
    return false;
  }

  const email = emailInput.value.trim().toLowerCase();

  if (!email) {
    alert("Please enter your college email.");
    return false;
  }

  if (!isAllowedEmail(email)) {
    alert("Please enter a valid college email address.");
    return false;
  }

  const actionCodeSettings = {
    url: window.location.origin + window.location.pathname,
    handleCodeInApp: true
  };

  try {
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);

    window.localStorage.setItem("emailForSignIn", email);

    alert(
      "A verification link has been sent to your email. Open it to verify your email."
    );

    return false;
  } catch (error) {
    console.error(error);
    alert("Firebase error: " + error.code + "\n" + error.message);
    return false;
  }
}

async function completeEmailSignIn() {
  if (!isSignInWithEmailLink(auth, window.location.href)) {
    return;
  }

  let email = window.localStorage.getItem("emailForSignIn");

  if (!email) {
    email = prompt("Please enter your college email again:");
  }

  if (!email) {
    return;
  }

  email = email.trim().toLowerCase();

  if (!isAllowedEmail(email)) {
    alert("Please enter a valid college email address.");
    return;
  }

  try {
    const result = await signInWithEmailLink(
      auth,
      email,
      window.location.href
    );

    window.localStorage.removeItem("emailForSignIn");

    currentUser = result.user;

    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );

    alert("Your email has been verified. You can now post.");

    await loadNotices();
  } catch (error) {
    console.error(error);
    alert("Email verification failed or the link has expired.");
  }
}

completeEmailSignIn();

async function loadNotices() {
  try {
    const noticesQuery = query(
      collection(db, "notices"),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(noticesQuery);

    notices = snapshot.docs.map(function(document) {
      return {
        id: document.id,
        ...document.data()
      };
    });

    renderNotices(notices);
  } catch (error) {
    console.error(error);
    alert("Could not load notices.");
  }
}

function renderNotices(list) {
  const grid = document.getElementById("noticeGrid");

  grid.innerHTML = "";

  const validNotices = list.filter(function(notice) {
    return notice.title && notice.title.trim() !== "";
  });

  if (validNotices.length === 0) {
    grid.innerHTML = '<p class="empty-msg">No needs posted yet. Be the first!</p>';
    return;
  }

  validNotices.forEach(function(notice) {
    const card = document.createElement("button");

    card.className = "notice-card";

    card.innerHTML = `
      <div class="pin"></div>
      <p class="notice-label">Need</p>
      <p class="notice-title"></p>
      <p class="notice-meta"></p>
      <div class="notice-footer">
        <span class="offer-link">offer it →</span>
        <button class="delete-btn">✕</button>
      </div>
    `;

    card.querySelector(".notice-title").textContent = notice.title;
    card.querySelector(".notice-meta").textContent = notice.meta;

    const deleteButton = card.querySelector(".delete-btn");

    if (!currentUser || notice.ownerUid !== currentUser.uid) {
      deleteButton.style.display = "none";
    }

    deleteButton.addEventListener("click", function(event) {
      event.stopPropagation();
      deleteNotice(notice.id);
    });

    card.addEventListener("click", function() {
      openOfferModal(notice.id);
    });

    grid.appendChild(card);
  });
}

document.getElementById("pinBtn").addEventListener("click", async function() {
  if (!isAuthenticatedStudent()) {
    const authenticated = await authenticateUser();

    if (!authenticated) {
      return;
    }
  }

  const emailInput = document.querySelector(
    '#TNeed input[type="email"]'
  );

  const email = emailInput.value.trim().toLowerCase();
  const title = document.getElementById("itemName").value.trim();
  const grade = document.getElementById("itemGrade").value;
  const context = document.getElementById("itemContext").value.trim();
  const from = document.getElementById("itemFrom").value;
  const days = document.getElementById("itemDays").value;
  const price = document.getElementById("itemPrice").value;

  if (!email || !title || !context || !from || !days || !price) {
    alert("Please fill in all fields.");
    return;
  }

  if (!isAllowedEmail(email)) {
    alert("Please enter a valid college email address.");
    return;
  }

  if (!currentUser || email !== currentUser.email.toLowerCase()) {
    alert("The email must match the account you are signed in with.");
    return;
  }

  const newNotice = {
    title: title,
    meta: grade + " · " + context,
    grade: grade,
    context: context,
    from: from,
    days: days,
    price: price,
    borrowerEmail: email,
    ownerUid: currentUser.uid,
    createdAt: Date.now()
  };

  try {
    await addDoc(collection(db, "notices"), newNotice);

    document.getElementById("TNeed").classList.remove("open");

    emailInput.value = "";
    document.getElementById("itemName").value = "";
    document.getElementById("itemContext").value = "";
    document.getElementById("itemFrom").value = "";
    document.getElementById("itemDays").value = "";
    document.getElementById("itemPrice").value = "";

    await loadNotices();
  } catch (error) {
    console.error(error);
    alert("Could not post your need.");
  }
});

async function deleteNotice(id) {
  if (!isAuthenticatedStudent()) {
    return;
  }

  const notice = notices.find(function(notice) {
    return notice.id === id;
  });

  if (!notice) {
    return;
  }

  if (notice.ownerUid !== currentUser.uid) {
    alert("You can only remove your own need.");
    return;
  }

  if (
    !confirm("Are you sure you want to remove this need?")
  ) {
    return;
  }

  try {
    await deleteDoc(doc(db, "notices", id));
    await loadNotices();
  } catch (error) {
    console.error(error);
    alert("Could not remove this need.");
  }
}

function openOfferModal(noticeId) {
  currentOfferId = noticeId;

  const notice = notices.find(function(n) {
    return n.id === noticeId;
  });

  if (!notice) {
    return;
  }

  document.getElementById("offerTitle").textContent = notice.title;
  document.getElementById("offerMeta").textContent = notice.meta;
  document.getElementById("offerFrom").textContent =
    notice.from || "Not specified";
  document.getElementById("offerDays").textContent =
    notice.days || "-";
  document.getElementById("offerPrice").textContent =
    notice.price ? "Rs. " + notice.price + "/day" : "-";

  document.getElementById("offerStep1").classList.remove("hidden");
  document.getElementById("offerStep2").classList.add("hidden");
  document.getElementById("offerStep3").classList.add("hidden");

  document.getElementById("offerModal").classList.add("open");
}

function showOfferForm() {
  document.getElementById("offerStep1").classList.add("hidden");
  document.getElementById("offerStep2").classList.remove("hidden");

  document.getElementById("offerName").value = "";
  document.getElementById("offerDate").value = "";
}

function closeOfferModal() {
  document.getElementById("offerModal").classList.remove("open");
  currentOfferId = null;
}

async function submitOffer() {
  if (!isAuthenticatedStudent()) {
    const authenticated = await authenticateUser();

    if (!authenticated) {
      return;
    }
  }

  const name = document.getElementById("offerName").value.trim();
  const grade = document.getElementById("offerGrade").value;
  const date = document.getElementById("offerDate").value.trim();

  if (!name || !date) {
    alert("Please fill in all fields.");
    return;
  }

  const notice = notices.find(function(n) {
    return n.id === currentOfferId;
  });

  if (!notice) {
    return;
  }

  document.getElementById("borrowerEmail").textContent =
    notice.borrowerEmail;

  document.getElementById("offerStep2").classList.add("hidden");
  document.getElementById("offerStep3").classList.remove("hidden");
}

async function confirmBooking() {
  if (!currentOfferId) {
    return;
  }

  if (
    confirm(
      "Are you sure you want to book this need? It will be removed from the board."
    )
  ) {
    await deleteNotice(currentOfferId);
    closeOfferModal();
  }
}

document.getElementById("OpenBtn").addEventListener("click", function() {
  const emailInput = document.querySelector('#TNeed input[type="email"]');

  if (currentUser && currentUser.email) {
    emailInput.value = currentUser.email;
  }

  document.getElementById("TNeed").classList.add("open");
});

document.getElementById("cancelBtn").addEventListener("click", function() {
  document.getElementById("TNeed").classList.remove("open");
});

document.getElementById("TNeed").addEventListener("click", function(e) {
  if (e.target === document.getElementById("TNeed")) {
    document.getElementById("TNeed").classList.remove("open");
  }
});

document.getElementById("offerModal").addEventListener("click", function(e) {
  if (e.target === document.getElementById("offerModal")) {
    closeOfferModal();
  }
});

document.querySelector(".iconBtn").addEventListener("click", async function() {
  if (isAuthenticatedStudent()) {
    alert("Signed in as " + currentUser.email);
    return;
  }

  await authenticateUser();
});

onAuthStateChanged(auth, async function(user) {
  currentUser = user;

  if (
    user &&
    user.emailVerified &&
    isAllowedEmail(user.email)
  ) {
    await loadNotices();
  } else {
    notices = [];
    renderNotices([]);
  }
});

window.showOfferForm = showOfferForm;
window.closeOfferModal = closeOfferModal;
window.submitOffer = submitOffer;
window.confirmBooking = confirmBooking;
