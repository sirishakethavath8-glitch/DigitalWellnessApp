import { initializeApp } from
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
  getFirestore, collection, doc, setDoc, addDoc, getDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
  updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

// Replace these values with your own Firebase web app configuration.
const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "PASTE_YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_STORAGE_BUCKET",
  messagingSenderId: "PASTE_YOUR_MESSAGING_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const $ = id => document.getElementById(id);
let currentUser = null;
let currentRole = null;
let stopApprovedListener = null;
let stopPendingListener = null;
let busy = false;

function status(id, message) {
  $(id).textContent = message;
}

function setBusy(value) {
  busy = value;
  $("ideaSubmitButton").disabled = value;
  $("ideaRegister").disabled = value;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[c]);
}

function stopListeners() {
  if (stopApprovedListener) stopApprovedListener();
  if (stopPendingListener) stopPendingListener();
  stopApprovedListener = null;
  stopPendingListener = null;
}

function renderApproved(snapshot) {
  const container = $("approvedIdeas");
  container.replaceChildren();

  if (snapshot.empty) {
    container.textContent = "No approved ideas yet. Be the first to share!";
    return;
  }

  snapshot.forEach(item => {
    const idea = item.data();
    const article = document.createElement("article");
    article.className = "entry";

    const title = document.createElement("h3");
    title.textContent = idea.title || "Student idea";

    const category = document.createElement("p");
    category.className = "muted";
    category.textContent = `${idea.category || "Idea"} • ${idea.authorName || "Student"}`;

    const description = document.createElement("p");
    description.textContent = idea.description || "";

    article.append(title, category, description);

    if (idea.imageURL) {
      const image = document.createElement("img");
      image.src = idea.imageURL;
      image.alt = `Poster for ${idea.title || "student idea"}`;
      image.loading = "lazy";
      image.style.maxWidth = "100%";
      image.style.maxHeight = "400px";
      image.style.objectFit = "contain";
      article.append(image);
    }

    container.append(article);
  });
}

function renderPending(snapshot) {
  const container = $("pendingIdeas");
  container.replaceChildren();

  if (snapshot.empty) {
    container.textContent = "No ideas waiting for review.";
    return;
  }

  snapshot.forEach(item => {
    const idea = item.data();
    const article = document.createElement("article");
    article.className = "entry";

    const title = document.createElement("h3");
    title.textContent = idea.title || "Student idea";

    const info = document.createElement("p");
    info.textContent = `${idea.category || "Idea"} • ${idea.authorName || "Student"}`;

    const description = document.createElement("p");
    description.textContent = idea.description || "";

    article.append(title, info, description);

    if (idea.imageURL) {
      const image = document.createElement("img");
      image.src = idea.imageURL;
      image.alt = "Submitted poster";
      image.style.maxWidth = "100%";
      image.style.maxHeight = "300px";
      article.append(image);
    }

    const approve = document.createElement("button");
    approve.textContent = "Approve";
    approve.addEventListener("click", () => reviewIdea(item.id, "approved"));

    const reject = document.createElement("button");
    reject.textContent = "Reject";
    reject.className = "secondary";
    reject.addEventListener("click", () => reviewIdea(item.id, "rejected"));

    const actions = document.createElement("div");
    actions.className = "entry-actions";
    actions.append(approve, reject);
    article.append(actions);
    container.append(article);
  });
}

function startListeners() {
  stopListeners();

  // Firestore rules allow this query only for approved public ideas.
  const approvedQuery = query(
    collection(db, "ideas"),
    where("status", "==", "approved"),
    orderBy("createdAt", "desc")
  );

  stopApprovedListener = onSnapshot(approvedQuery, renderApproved, error => {
    console.error(error);
    status("ideaSubmitStatus", "Could not load the idea wall. Check database rules and connection.");
  });

  if (currentRole === "teacher") {
    $("teacherIdeaPanel").hidden = false;

    const pendingQuery = query(
      collection(db, "ideas"),
      where("status", "==", "pending"),
      orderBy("createdAt", "asc")
    );

    stopPendingListener = onSnapshot(pendingQuery, renderPending, error => {
      console.error(error);
      status("ideaAuthStatus", "Teacher review could not load. Check teacher permissions.");
    });
  } else {
    $("teacherIdeaPanel").hidden = true;
    $("pendingIdeas").replaceChildren();
  }
}

async function reviewIdea(id, statusValue) {
  if (!currentUser || currentRole !== "teacher") {
    status("ideaAuthStatus", "Teacher account required.");
    return;
  }

  try {
    await updateDoc(doc(db, "ideas", id), {
      status: statusValue,
      reviewedBy: currentUser.uid,
      reviewedAt: serverTimestamp()
    });
    status("ideaAuthStatus", `Idea ${statusValue}.`);
  } catch (error) {
    console.error(error);
    status("ideaAuthStatus", "Review failed. Check teacher permissions.");
  }
}

$("ideaAuthForm").addEventListener("submit", async event => {
  event.preventDefault();

  try {
    const email = $("ideaEmail").value.trim();
    const password = $("ideaPassword").value;
    await signInWithEmailAndPassword(auth, email, password);
    status("ideaAuthStatus", "Signed in successfully.");
  } catch (error) {
    console.error(error);
    status("ideaAuthStatus", "Sign-in failed. Check your email/password or create an account.");
  }
});

$("ideaRegister").addEventListener("click", async () => {
  if (busy) return;

  const email = $("ideaEmail").value.trim();
  const password = $("ideaPassword").value;

  if (!email || password.length < 8) {
    status("ideaAuthStatus", "Enter an email and a password with at least 8 characters.");
    return;
  }

  try {
    $("ideaRegister").disabled = true;
    await createUserWithEmailAndPassword(auth, email, password);
    // Account creation triggers onAuthStateChanged.
    // New accounts receive student role only through Firestore rules.
    status("ideaAuthStatus", "Student account created. You are signed in.");
  } catch (error) {
    console.error(error);
    status("ideaAuthStatus", "Account creation failed. Check the email, password and Firebase Authentication setup.");
  } finally {
    $("ideaRegister").disabled = false;
  }
});

$("ideaLogout").addEventListener("click", async () => {
  try {
    await signOut(auth);
    status("ideaAuthStatus", "Signed out.");
  } catch (error) {
    console.error(error);
    status("ideaAuthStatus", "Sign-out failed.");
  }
});

$("ideaSubmitForm").addEventListener("submit", async event => {
  event.preventDefault();

  if (busy) return;
  if (!currentUser) {
    status("ideaSubmitStatus", "Please sign in before submitting an idea.");
    return;
  }

  const title = $("ideaTitle").value.trim();
  const category = $("ideaCategory").value;
  const description = $("ideaDescription").value.trim();
  const file = $("ideaPoster").files[0];

  const allowedCategories = [
    "Digital Wellness", "Cyber Safety", "Healthy Habits",
    "School Activities", "Poster & Slogan"
  ];

  if (!title || title.length > 100 ||
      !description || description.length > 1500 ||
      !allowedCategories.includes(category)) {
    status("ideaSubmitStatus", "Check the title, category and description.");
    return;
  }

  if (file && (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 3 * 1024 * 1024
  )) {
    status("ideaSubmitStatus", "Choose a JPG, PNG or WebP image under 3 MB.");
    return;
  }

  setBusy(true);
  status("ideaSubmitStatus", "Submitting your idea...");

  let uploadedPath = null;

  try {
    let imageURL = "";

    // Upload under a user-specific folder; Storage rules enforce access and size.
    if (file) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      uploadedPath = `idea-posters/${currentUser.uid}/${crypto.randomUUID()}-${safeName}`;
      const imageRef = ref(storage, uploadedPath);

      await uploadBytes(imageRef, file, {
        contentType: file.type
      });
      imageURL = await getDownloadURL(imageRef);
    }

    await addDoc(collection(db, "ideas"), {
      title,
      category,
      description,
      authorId: currentUser.uid,
      authorName: currentUser.email.split("@")[0],
      imageURL,
      imagePath: uploadedPath || "",
      status: "pending",
      createdAt: serverTimestamp()
    });

    $("ideaSubmitForm").reset();
    status("ideaSubmitStatus", "Submitted! Your idea is pending teacher approval.");
  } catch (error) {
    console.error(error);
    status("ideaSubmitStatus", "Submission failed. Check Firebase setup, permissions and internet connection.");
  } finally {
    setBusy(false);
  }
});

onAuthStateChanged(auth, async user => {
  stopListeners();
  currentUser = user;
  currentRole = null;

  $("ideaLogout").hidden = !user;
  $("ideaSubmitButton").disabled = !user;
  $("ideaRegister").disabled = false;
  $("ideaRole").textContent = "";

  if (!user) {
    $("ideaAuthStatus").textContent = "Sign in to submit an idea.";
    $("ideaRole").textContent = "You are signed out.";
    $("teacherIdeaPanel").hidden = true;
    $("approvedIdeas").textContent = "Sign in or visit the public idea wall to load approved ideas.";
    return;
  }

  try {
    const profile = await getDoc(doc(db, "users", user.uid));
    currentRole = profile.exists() ? profile.data().role : "student";

    $("ideaRole").textContent =
      currentRole === "teacher" ? "Signed in as teacher." : "Signed in as student.";

    $("ideaAuthStatus").textContent = "You are signed in.";
    startListeners();
  } catch (error) {
    console.error(error);
    $("ideaAuthStatus").textContent =
      "Could not load your profile. Check Firestore security rules.";
  }
});