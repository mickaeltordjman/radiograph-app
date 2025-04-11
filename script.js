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
  // Save the current responses, if needed
  saveCurrentResponse();

  // Create an array of rows from your stored responses.
  const rows = Object.keys(responses).map(filename => {
    const response = responses[filename];
    return {
      UserID: userID,                              // Must match your sheet column exactly.
      ImageID: filename,                           // Make sure these values are set.
      Q1_TechQuality: response.q1 || "",
      Q2_Artifacts: response.q2 || "",
      Q3_Abnormality: response.q3 
                        ? (Array.isArray(response.q3) ? response.q3.join(", ") : response.q3)
                        : "",
      Q4_Comment: response.q4 || ""
    };
  });

  try {
    // Process each row separately
    for (const row of rows) {
      // Build the body according to the sample provided by Sheety
      let body = {
        sheet1: row
      };

      console.log("Submitting payload:", JSON.stringify(body, null, 2));

      // Send the POST request
      const res = await fetch(backendURL, {
        method: "POST",
        // Even though the example you saw might not include headers,
        // it is recommended to include the Content-Type header.
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      // Convert the response to JSON and log it.
      const json = await res.json();
      console.log("Row added:", json.sheet1);
    }

    alert("✅ Responses submitted successfully!");
    // Clear responses for the user
    localStorage.removeItem("responses_" + userID);
    location.reload();
  } catch (error) {
    console.error("Submission error:", error);
    alert("❌ Submission failed. Try again later.");
  }
}
