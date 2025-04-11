// script.js
let images = [];
let responses = {};
let currentIndex = 0;
let userID = "";
const backendURL = "https://api.sheety.co/b8b3a9443e61e89c91f5e8a1c1c3bdf3/untitledSpreadsheet/sheet1";
  

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
  // Save the current response if not already saved
  saveCurrentResponse();

  // Build an array of rows to submit.
  // Each row is built to match your Google Sheet's columns.
  const rows = Object.keys(responses).map(filename => {
    const response = responses[filename];
    return {
      UserID: userID,                            // Column: UserID
      ImageID: filename,                         // Column: ImageID
      Q1_TechQuality: response.q1 || "",         // Column: Q1_TechQuality
      Q2_Artifacts: response.q2 || "",           // Column: Q2_Artifacts
      // For Q3_Abnormality, join the selected options if it's an array
      Q3_Abnormality: response.q3 ? 
                        (Array.isArray(response.q3) ? response.q3.join(", ") : response.q3) 
                        : "",
      Q4_Comment: response.q4 || ""              // Column: Q4_Comment
    };
  });

  try {
    // Loop over each row and submit it as a POST request to Sheety.
    for (const row of rows) {
      // The JSON payload is wrapped in an object with the resource key.
      // This key should match what Sheety generated—in this case, it's "sheet1".
      const payload = { sheet1: row };

      const res = await fetch(backendURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("Request failed with status " + res.status);
      }
    }

    alert("✅ Responses submitted successfully!");
    // Clear local storage for this user to prevent resubmission
    localStorage.removeItem("responses_" + userID);
    location.reload();
  } catch (error) {
    console.error("Submission error:", error);
    alert("❌ Submission failed. Try again later.");
  }
}
