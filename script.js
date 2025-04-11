// script.js
let images = [];
let responses = {};
let currentIndex = 0;
let userID = "";
const backendURL = "https://script.google.com/macros/s/AKfycby5hpEkERGvDvRgbBoJEv0vuWI7_IALQZ3MmNc3oXToH60URcoQ0gbYTdpDYtgCwbn8/exec";
  

window.onload = async () => {
  const res = await fetch("images.json");
  images = await res.json();
  document.getElementById("submitBtn").disabled = true;
};

function startSession() {
  userID = document.getElementById("userID").value.trim();
  if (!userID) return alert("Please enter a valid ID");

  // Load saved progress if exists
  const saved = localStorage.getItem("responses_" + userID);
  if (saved) {
    const data = JSON.parse(saved);
    responses = data.responses;
    currentIndex = data.index || 0;
  } else {
    // Shuffle images once per user
    images = images.sort(() => 0.5 - Math.random());
  }

  document.getElementById("login-section").style.display = "none";
  document.getElementById("questionnaire").style.display = "block";
  loadImage();
}

function loadImage() {
  if (currentIndex < 0) currentIndex = 0;
  if (currentIndex >= images.length) currentIndex = images.length - 1;

  const img = images[currentIndex];
  document.getElementById("radiograph").src = img.embedUrl;
  document.getElementById("progress").innerText = `Image ${currentIndex + 1} / ${images.length}`;

  const r = responses[img.fileName] || {};
  document.getElementById("q1").value = r.q1 || "";
  document.getElementById("q2").value = r.q2 || "";
  document.querySelectorAll("input[type=checkbox]").forEach(cb => {
    cb.checked = r.q3 ? r.q3.includes(cb.value) : false;
  });
  document.getElementById("q4").value = r.q4 || "";

  updateSubmitStatus();
}

function saveCurrentResponse() {
  const img = images[currentIndex];
  const q3 = Array.from(document.querySelectorAll("input[type=checkbox]:checked")).map(cb => cb.value);

  responses[img.fileName] = {
    q1: document.getElementById("q1").value,
    q2: document.getElementById("q2").value,
    q3: q3,
    q4: document.getElementById("q4").value.trim()
  };

  localStorage.setItem("responses_" + userID, JSON.stringify({ responses, index: currentIndex }));
}

function nextImage() {
  saveCurrentResponse();
  if (currentIndex < images.length - 1) currentIndex++;
  loadImage();
}

function prevImage() {
  saveCurrentResponse();
  if (currentIndex > 0) currentIndex--;
  loadImage();
}

function updateSubmitStatus() {
  const completed = Object.keys(responses).length;
  document.getElementById("submitBtn").disabled = completed < images.length;
}

async function submitAll() {
  saveCurrentResponse();

  const finalPayload = {
    userID,
    responses: Object.keys(responses).map(filename => {
      return {
        imageID: filename,
        ...responses[filename]
      };
    })
  };

  const res = await fetch(backendURL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(finalPayload)
  });

  if (res.ok) {
    alert("✅ Responses submitted successfully!");
    localStorage.removeItem("responses_" + userID);
    location.reload();
  } else {
    alert("❌ Submission failed. Try again later.");
  }
} 
