document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById("camera-feed");
  const appContainer = document.getElementById("app-container");

  // Check if the browser supports mediaDevices
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    // We want to access the back camera (environment)
    const constraints = {
      video: {
        facingMode: "environment",
      },
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
        // Display an error message to the user
        appContainer.innerHTML = `<div style="color: white; text-align: center; padding: 20px;">Could not access the camera. Please ensure you have given permission.</div>`;
      });
  } else {
    console.error("getUserMedia not supported on this browser!");
    appContainer.innerHTML = `<div style="color: white; text-align: center; padding: 20px;">Sorry, your browser does not support the necessary technology for this app.</div>`;
  }

  // --- FUTURE LOGIC WILL GO HERE ---
  // 1. Event listener for tapping on the video feed.
  // 2. Function to freeze frame and show the interaction overlay.
  // 3. Logic for the confirmation and rejection buttons.
  // 4. Function to send the cropped image to the OCR engine.
  // 5. Logic to display results in the results panel.
});
