/* =====================================
   WELLBUDDY - DIGITAL WELLNESS APP
   Complete JavaScript
===================================== */

const $ = (id) => document.getElementById(id);

function readData(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function saveData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function showPage(pageId) {
  const pages = document.querySelectorAll(".page");
  let found = false;

  pages.forEach((page) => {
    const selected = page.id === pageId;
    page.hidden = !selected;
    page.classList.toggle("active", selected);
    if (selected) found = true;
  });

  if (!found) {
    console.error("Page not found:", pageId);
    return;
  }

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (pageId === "reports") renderReports();
  if (pageId === "parent") renderParent();
  if (pageId === "teacher") renderTeacher();
  if (pageId === "dashboard") updateDashboard();
}

// Make navigation accessible to HTML onclick attributes.
window.showPage = showPage;

/* ---------- INITIAL DATA ---------- */

function getPoints() {
  return Number(readData("wellnessPoints", 0)) || 0;
}

function getChallenges() {
  return readData("completedChallenges", []);
}

function getHabits() {
  return readData("wellbuddyHabits", {});
}

function getSurvey() {
  return readData("wellbuddySurvey", null);
}

function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ---------- DASHBOARD ---------- */

function updateDashboard() {
  const survey = getSurvey();
  const challenges = getChallenges();
  const points = getPoints();
  const habits = getHabits();

  if ($("dashboardScreenTime")) {
    $("dashboardScreenTime").textContent =
      survey && survey.date === getToday()
        ? `${survey.hours} hours`
        : "Not entered";
  }

  if ($("dashboardChallenges")) {
    $("dashboardChallenges").textContent = challenges.length;
  }

  if ($("dashboardPoints")) {
    $("dashboardPoints").textContent = points;
  }

  const completedHabits = Object.values(habits).filter(Boolean).length;
  const percent = Math.round((completedHabits / 5) * 100);

  if ($("habitProgress")) {
    $("habitProgress").textContent =
      `${completedHabits} of 5 healthy habits completed today`;
  }

  if ($("detoxTree")) {
    const tree = percent >= 100 ? "🌳🌸" :
      percent >= 60 ? "🌳" :
      percent >= 20 ? "🌿" : "🌱";

    $("detoxTree").textContent = tree;
  }

  if ($("dashboardTree")) {
    $("dashboardTree").textContent =
      percent >= 100 ? "🌳 Blooming tree" :
      percent >= 60 ? "🌳 Growing tree" :
      percent >= 20 ? "🌿 Young tree" : "🌱 Seedling";
  }

  if ($("treeProgressBar")) {
    $("treeProgressBar").style.width = `${percent}%`;
  }

  if ($("treeProgressText")) {
    $("treeProgressText").textContent = `${percent}% of today's habits completed`;
  }

  document.querySelectorAll("[data-habit]").forEach((checkbox) => {
    checkbox.checked = Boolean(habits[checkbox.dataset.habit]);
  });
}

/* ---------- DAILY HABITS ---------- */

document.querySelectorAll("[data-habit]").forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    const habits = getHabits();
    habits[checkbox.dataset.habit] = checkbox.checked;
    saveData("wellbuddyHabits", habits);
    updateDashboard();
  });
});

/* ---------- SCREEN-TIME SURVEY ---------- */

if ($("screenTimeForm")) {
  $("screenTimeForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const hours = Number($("screenHours").value);
    const goal = Number($("screenGoal").value);

    if (
      !Number.isFinite(hours) || hours < 0 || hours > 24 ||
      !Number.isFinite(goal) || goal < 0 || goal > 24
    ) {
      $("surveyMessage").textContent = "Please enter valid hours between 0 and 24.";
      return;
    }

    const survey = {
      hours,
      goal,
      purpose: $("screenPurpose").value,
      feeling: $("screenFeeling").value,
      date: getToday()
    };

    saveData("wellbuddySurvey", survey);

    $("surveyMessage").textContent =
      hours <= goal
        ? "Great! You are within your screen-time goal. 🌱"
        : "Your screen time is above your goal. Try a short digital detox today.";

    updateDashboard();
  });
}

/* ---------- DIGITAL DETOX CHALLENGES ---------- */

document.querySelectorAll(".complete-challenge").forEach((button) => {
  button.addEventListener("click", () => {
    const challenge = button.dataset.challenge;
    const challenges = getChallenges();

    if (challenges.includes(challenge)) {
      alert("You have already completed this challenge!");
      return;
    }

    challenges.push(challenge);
    saveData("completedChallenges", challenges);

    saveData("wellnessPoints", getPoints() + 10);

    button.textContent = "✅ Completed";
    button.disabled = true;

    updateDashboard();

    const message = $("challengeMessage");
    if (message) {
      message.textContent = "Great job! You earned 10 wellness points. 🌱";
    }

    renderReports();
  });
});

function refreshChallengeButtons() {
  const challenges = getChallenges();

  document.querySelectorAll(".complete-challenge").forEach((button) => {
    const completed = challenges.includes(button.dataset.challenge);
    button.disabled = completed;
    button.textContent = completed ? "✅ Completed" : "Complete Challenge";
  });
}

/* ---------- STUDY TIMER ---------- */

let timerSeconds = 25 * 60;
let timerInterval = null;

function renderTimer() {
  if (!$("studyTimer")) return;

  const mins = Math.floor(timerSeconds / 60);
  const secs = timerSeconds % 60;

  $("studyTimer").textContent =
    `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

if ($("startTimer")) {
  $("startTimer").addEventListener("click", () => {
    if (timerInterval !== null) return;

    if (timerSeconds <= 0) timerSeconds = 25 * 60;

    $("timerStatus").textContent = "Focus session in progress. Keep going!";

    timerInterval = setInterval(() => {
      timerSeconds--;
      renderTimer();

      if (timerSeconds <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        $("timerStatus").textContent = "Focus session complete! Take a short break. 🎉";
        alert("Well done! Your 25-minute focus session is complete.");
      }
    }, 1000);
  });
}

if ($("pauseTimer")) {
  $("pauseTimer").addEventListener("click", () => {
    if (timerInterval !== null) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    if ($("timerStatus")) {
      $("timerStatus").textContent = "Timer paused.";
    }
  });
}

if ($("resetTimer")) {
  $("resetTimer").addEventListener("click", () => {
    if (timerInterval !== null) clearInterval(timerInterval);
    timerInterval = null;
    timerSeconds = 25 * 60;
    renderTimer();

    if ($("timerStatus")) {
      $("timerStatus").textContent = "Ready for a focused study session.";
    }
  });
}

/* ---------- QUIZ ---------- */

const quizQuestions = [
  {
    question: "Which habit helps reduce unnecessary phone usage?",
    options: ["Keep notifications on all day", "Set screen-time limits", "Scroll before every task", "Use multiple screens together"],
    answer: 1
  },
  {
    question: "What should you do before sharing personal information online?",
    options: ["Share it with everyone", "Post it publicly", "Check whether sharing is safe and necessary", "Send it to strangers"],
    answer: 2
  },
  {
    question: "Which activity is a healthy screen-free break?",
    options: ["More scrolling", "Outdoor walking", "Watching another video", "Checking every notification"],
    answer: 1
  },
  {
    question: "What is a strong password practice?",
    options: ["Use 123456", "Share it with friends", "Use a unique, hard-to-guess password", "Use your name only"],
    answer: 2
  },
  {
    question: "Which habit can support better sleep?",
    options: ["Use the phone all night", "Keep notifications loud", "Avoid screen distractions before bedtime", "Play games in bed for hours"],
    answer: 2
  }
];

let quizIndex = 0;
let quizScore = 0;
let quizAnswered = false;

function startQuiz() {
  quizIndex = 0;
  quizScore = 0;
  quizAnswered = false;

  if ($("quizScore")) $("quizScore").textContent = "";
  if ($("quizFeedback")) $("quizFeedback").textContent = "";
  if ($("startQuiz")) $("startQuiz").hidden = true;

  showQuestion();
}

function showQuestion() {
  const container = $("quizContainer");
  if (!container) return;

  if (quizIndex >= quizQuestions.length) {
    container.innerHTML =
      `<h3>Quiz completed! 🎉</h3><p>Your score: ${quizScore} / ${quizQuestions.length}</p>`;

    if ($("nextQuestion")) $("nextQuestion").hidden = true;
    if ($("startQuiz")) {
      $("startQuiz").hidden = false;
      $("startQuiz").textContent = "Try Again";
    }

    if ($("quizScore")) {
      $("quizScore").textContent = `Final score: ${quizScore}/${quizQuestions.length}`;
    }

    saveData("wellbuddyLastQuizScore", quizScore);
    return;
  }

  quizAnswered = false;
  const q = quizQuestions[quizIndex];

  container.replaceChildren();

  const heading = document.createElement("h3");
  heading.textContent = `Question ${quizIndex + 1} of ${quizQuestions.length}`;
  container.appendChild(heading);

  const question = document.createElement("p");
  question.textContent = q.question;
  container.appendChild(question);

  q.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quiz-option";
    button.textContent = option;
    button.style.display = "block";
    button.style.margin = "10px 0";
    button.style.width = "100%";

    button.addEventListener("click", () => {
      if (quizAnswered) return;
      quizAnswered = true;

      if (index === q.answer) {
        quizScore++;
        $("quizFeedback").textContent = "Correct answer! 🌟";
      } else {
        $("quizFeedback").textContent =
          `Not quite. Correct answer: ${q.options[q.answer]}`;
      }

      container.querySelectorAll(".quiz-option").forEach((item) => {
        item.disabled = true;
      });

      if ($("nextQuestion")) {
        $("nextQuestion").hidden = false;
        $("nextQuestion").textContent =
          quizIndex === quizQuestions.length - 1 ? "Show Results" : "Next Question";
      }

      if ($("quizScore")) {
        $("quizScore").textContent = `Current score: ${quizScore}`;
      }
    });

    container.appendChild(button);
  });

  if ($("nextQuestion")) $("nextQuestion").hidden = true;
}

if ($("startQuiz")) {
  $("startQuiz").addEventListener("click", startQuiz);
}

if ($("nextQuestion")) {
  $("nextQuestion").addEventListener("click", () => {
    if (!quizAnswered) return;
    quizIndex++;
    $("quizFeedback").textContent = "";
    showQuestion();
  });
}

/* ---------- SLOGAN ACTIVITY ---------- */

if ($("saveSlogan")) {
  $("saveSlogan").addEventListener("click", () => {
    const slogan = $("sloganInput").value.trim();

    if (!slogan) {
      $("sloganMessage").textContent = "Please enter your slogan first.";
      return;
    }

    saveData("wellbuddySlogan", slogan);
    $("sloganMessage").textContent = "Your slogan has been saved! ✍️";
  });
}

/* ---------- POSTER PREVIEW ---------- */

if ($("uploadPoster")) {
  $("uploadPoster").addEventListener("click", () => {
    const file = $("posterUpload").files[0];
    const preview = $("posterPreview");

    if (!file) {
      preview.textContent = "Please choose an image first.";
      return;
    }

    if (!file.type.startsWith("image/")) {
      preview.textContent = "Please choose a valid image.";
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      preview.textContent = "Please choose an image smaller than 3 MB.";
      return;
    }

    const url = URL.createObjectURL(file);
    preview.replaceChildren();

    const img = document.createElement("img");
    img.src = url;
    img.alt = "Selected poster preview";
    img.style.maxWidth = "100%";
    img.style.maxHeight = "350px";

    preview.appendChild(img);
  });
}

/* ---------- PROFILE ---------- */

if ($("profileForm")) {
  const profile = readData("wellbuddyProfile", {});

  if ($("studentName")) $("studentName").value = profile.name || "";
  if ($("studentClass")) $("studentClass").value = profile.studentClass || "";
  if ($("studentGoal")) $("studentGoal").value = profile.goal || "balanced";

  $("profileForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const profileData = {
      name: $("studentName").value.trim(),
      studentClass: $("studentClass").value.trim(),
      goal: $("studentGoal").value
    };

    saveData("wellbuddyProfile", profileData);
    $("profileMessage").textContent = "Profile saved successfully! ✅";
  });
}

/* ---------- REPORTS ---------- */

function renderReports() {
  const survey = getSurvey();
  const challenges = getChallenges();
  const points = getPoints();
  const habits = getHabits();

  if ($("dailyReport")) {
    $("dailyReport").replaceChildren();

    const lines = [
      `Screen time: ${survey ? survey.hours + " hours" : "Not entered"}`,
      `Challenges completed: ${challenges.length}`,
      `Wellness points: ${points}`,
      `Healthy habits completed today: ${Object.values(habits).filter(Boolean).length}/5`,
      `Last quiz score: ${readData("wellbuddyLastQuizScore", "Not attempted")}`
    ];

    lines.forEach((line) => {
      const p = document.createElement("p");
      p.textContent = line;
      $("dailyReport").appendChild(p);
    });
  }

  if ($("weeklyReport")) {
    $("weeklyReport").textContent =
      "This prototype records your latest survey and challenge totals in this browser. It does not yet store a full seven-day history.";
  }

  if ($("badges")) {
    const badges = [];
    if (challenges.length >= 1) badges.push("🌟 First Challenge");
    if (challenges.length >= 3) badges.push("🏅 Wellness Champion");
    if (points >= 50) badges.push("💎 50-Point Star");

    $("badges").textContent = badges.length
      ? badges.join("  •  ")
      : "Complete challenges to earn your first badge.";
  }
}

if ($("exportReport")) {
  $("exportReport").addEventListener("click", () => {
    const survey = getSurvey();
    const report = [
      "WELLBUDDY DIGITAL WELLNESS REPORT",
      `Date: ${getToday()}`,
      `Screen time: ${survey ? survey.hours + " hours" : "Not entered"}`,
      `Daily goal: ${survey ? survey.goal + " hours" : "Not entered"}`,
      `Challenges completed: ${getChallenges().length}`,
      `Wellness points: ${getPoints()}`,
      `Quiz score: ${readData("wellbuddyLastQuizScore", "Not attempted")}`
    ].join("\n");

    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "WellBuddy-Report.txt";
    link.click();
    URL.revokeObjectURL(url);
  });
}

/* ---------- CERTIFICATE ---------- */

if ($("generateCertificate")) {
  $("generateCertificate").addEventListener("click", () => {
    const profile = readData("wellbuddyProfile", {});
    const name = profile.name || "WellBuddy Student";

    const area = $("certificateArea");
    area.replaceChildren();

    const certificate = document.createElement("div");
    certificate.className = "card";
    certificate.style.textAlign = "center";
    certificate.style.padding = "30px";
    certificate.style.border = "3px solid #5b5bd6";

    const title = document.createElement("h2");
    title.textContent = "🏆 Certificate of Participation";

    const text = document.createElement("p");
    text.textContent = `This certificate is presented to ${name} for participating in the WellBuddy Digital Wellness journey.`;

    const date = document.createElement("p");
    date.textContent = `Date: ${getToday()}`;

    const printButton = document.createElement("button");
    printButton.type = "button";
    printButton.textContent = "Print Certificate";
    printButton.addEventListener("click", () => window.print());

    certificate.append(title, text, date, printButton);
    area.appendChild(certificate);
  });
}

/* ---------- PARENT & TEACHER DEMO REPORTS ---------- */

function renderParent() {
  if (!$("parentReport")) return;

  const survey = getSurvey();
  $("parentReport").textContent =
    `Latest screen time: ${survey ? survey.hours + " hours" : "Not entered"} | ` +
    `Challenges completed: ${getChallenges().length} | ` +
    `Wellness points: ${getPoints()}`;
}

function renderTeacher() {
  if (!$("teacherReport")) return;

  $("teacherReport").textContent =
    `This browser's demo data: ${getChallenges().length} challenges completed and ${getPoints()} wellness points.`;
}

/* ---------- NAVIGATION MENU ---------- */

if ($("menuToggle")) {
  $("menuToggle").addEventListener("click", () => {
    const nav = $("mainNav");
    if (nav) nav.classList.toggle("menu-open");
  });
}

/* ---------- STARTUP ---------- */

document.addEventListener("DOMContentLoaded", () => {
  showPage("dashboard");
  updateDashboard();
  refreshChallengeButtons();
  renderTimer();
  renderReports();

  const savedSlogan = readData("wellbuddySlogan", "");
  if ($("sloganInput") && savedSlogan) {
    $("sloganInput").value = savedSlogan;
  }
});