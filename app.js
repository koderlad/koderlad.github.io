document.addEventListener("DOMContentLoaded", () => {
  // --- 1. GET ALL OUR DOM ELEMENTS ---
  const video = document.getElementById("camera-feed");
  const appContainer = document.getElementById("app-container");
  const snapshotCanvas = document.getElementById("snapshot-canvas");
  const interactionOverlay = document.getElementById("interaction-overlay");
  const selectionBox = document.getElementById("selection-box");
  const btnReject = document.getElementById("btn-reject");
  const btnConfirm = document.getElementById("btn-confirm");

  // Get the 2D context of our canvas
  const ctx = snapshotCanvas.getContext("2d");

  // --- 2. CAMERA INITIALIZATION ---
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
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
  } else {
    console.error("getUserMedia not supported on this browser!");
    appContainer.innerHTML = `<div style="color: white; text-align: center; padding: 20px;">Sorry, your browser does not support the necessary technology for this app.</div>`;
  }

  // --- 3. CORE APP LOGIC ---

  // Function to handle the tap on the video
  function handleVideoTap(event) {
    // Pause the video feed to freeze the frame
    video.pause();

    // Match canvas dimensions to the video's actual displayed size
    snapshotCanvas.width = video.videoWidth;
    snapshotCanvas.height = video.videoHeight;

    // Draw the current video frame onto our hidden canvas
    ctx.drawImage(video, 0, 0, snapshotCanvas.width, snapshotCanvas.height);

    // Use the canvas as the background for our interaction overlay
    // This creates the "frozen frame" effect.
    interactionOverlay.style.backgroundImage = `url(${snapshotCanvas.toDataURL()})`;
    interactionOverlay.style.backgroundSize = "cover";

    // Show the interaction overlay
    interactionOverlay.style.display = "block";

    // --- Initial Selection Box Placement ---
    // For now, we'll just place a box where the user tapped.
    const boxWidth = 150;
    const boxHeight = 50;

    // The event gives us coordinates relative to the viewport.
    // We need to make sure the box doesn't go off-screen.
    let tapX = event.clientX;
    let tapY = event.clientY;

    selectionBox.style.width = `${boxWidth}px`;
    selectionBox.style.height = `${boxHeight}px`;
    selectionBox.style.left = `${tapX - boxWidth / 2}px`;
    selectionBox.style.top = `${tapY - boxHeight / 2}px`;
  }

  function resetToLiveView() {
    // Hide the overlay
    interactionOverlay.style.display = "none";
    // Resume the camera feed
    video.play();
  }

  // --- 4. EVENT LISTENERS ---

  // Listen for a click/tap on the video itself
  video.addEventListener("click", handleVideoTap);

  // Listen for a click on the "Reject" button
  btnReject.addEventListener("click", resetToLiveView);

  // Listen for a click on the "Confirm" button
  btnConfirm.addEventListener("click", () => {
    console.log("Selection Confirmed!");
    // In the future, this is where we will trigger the OCR.
    // For now, it just resets the view like the reject button.

    // Placeholder for future logic:
    // 1. Get the final position and size of the selectionBox.
    // 2. Create a new canvas with just the cropped image data.
    // 3. Send that cropped image to the OCR engine.

    resetToLiveView();
  });
});
