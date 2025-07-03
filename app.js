document.addEventListener("DOMContentLoaded", () => {
  // --- 1. DEVICE DETECTION ---

  /**
   * Checks if the user is on a mobile device based on the User-Agent string.
   * @returns {boolean} True if a mobile device is detected, otherwise false.
   */
  function isMobile() {
    const regex =
      /Mobi|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return regex.test(navigator.userAgent);
  }

  // --- 2. MAIN LOGIC ROUTING ---

  if (isMobile()) {
    // MOBILE PATH: Run the app initialization code.
    initializeApp();
  } else {
    // DESKTOP PATH: Show the static message.
    console.log("Desktop device detected. Displaying message.");
    displayDesktopMessage();
  }

  function displayDesktopMessage() {
    document.getElementById("app-container").style.display = "none";
    const desktopMessage = document.getElementById("desktop-message");
    desktopMessage.style.display = "flex"; // Use flex to center the content as styled in CSS
  }

  function initializeApp() {
    // --- GET ALL OUR DOM ELEMENTS ---
    const video = document.getElementById("camera-feed");
    const appContainer = document.getElementById("app-container");
    const snapshotCanvas = document.getElementById("snapshot-canvas");
    const interactionOverlay = document.getElementById("interaction-overlay");
    const selectionBox = document.getElementById("selection-box");
    const btnReject = document.getElementById("btn-reject");
    const btnConfirm = document.getElementById("btn-confirm");
    const ctx = snapshotCanvas.getContext("2d");

    // --- CAMERA INITIALIZATION ---
    const constraints = {
      video: { facingMode: "environment" },
      audio: false,
    };

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        video.srcObject = stream;
        video.play();
      })
      .catch((err) => {
        console.error("Error accessing camera: ", err);
        appContainer.innerHTML = `<div style="color: white; text-align: center; padding: 20px;">Could not access the camera. Please ensure you have given permission.</div>`;
      });

    // --- CORE APP LOGIC ---
    function handleVideoTap(event) {
      event.preventDefault();
      video.pause();

      snapshotCanvas.width = video.videoWidth;
      snapshotCanvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, snapshotCanvas.width, snapshotCanvas.height);

      interactionOverlay.style.backgroundImage = `url(${snapshotCanvas.toDataURL()})`;
      interactionOverlay.style.backgroundSize = "cover";
      interactionOverlay.style.display = "block";

      const touch = event.touches[0];
      let tapX = touch.clientX;
      let tapY = touch.clientY;

      const boxWidth = 150;
      const boxHeight = 50;

      selectionBox.style.width = `${boxWidth}px`;
      selectionBox.style.height = `${boxHeight}px`;
      selectionBox.style.left = `${tapX - boxWidth / 2}px`;
      selectionBox.style.top = `${tapY - boxHeight / 2}px`;
    }

    function resetToLiveView() {
      interactionOverlay.style.display = "none";
      video.play();
    }

    // --- EVENT LISTENERS ---
    video.addEventListener("touchstart", handleVideoTap);
    btnReject.addEventListener("click", resetToLiveView);
    btnConfirm.addEventListener("click", () => {
      console.log("Selection Confirmed!");
      resetToLiveView();
    });
  }
});
