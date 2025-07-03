// Get references to our HTML elements
const videoElement = document.getElementById("camera-feed");
const cameraContainer = document.getElementById("camera-container");
const desktopView = document.getElementById("desktop-view");

/**
 * Checks if the user is likely on a mobile device.
 * It checks for touch support and also looks for "Mobi" in the user agent string.
 * @returns {boolean} - True if it's likely a mobile device, false otherwise.
 */
function isMobile() {
  const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const isMobileUA = /Mobi|Android|iPhone/i.test(navigator.userAgent);
  return hasTouch && isMobileUA;
}

/**
 * Starts the camera stream.
 */
async function startCamera() {
  try {
    const constraints = {
      video: {
        facingMode: "environment",
      },
      audio: false,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.srcObject = stream;
  } catch (err) {
    console.error("Error accessing the camera: ", err);
    alert(
      "Could not access the camera. Please grant permission and ensure you are on a secure (https) connection."
    );
  }
}

// --- Main Application Logic ---
// Check if we are on a mobile device and run the appropriate function.
if (isMobile()) {
  // If mobile, start the camera. The desktop view remains hidden by default.
  startCamera();
} else {
  // If not mobile, hide the camera container and show the desktop view.
  cameraContainer.style.display = "none";
  desktopView.style.display = "flex"; // Use 'flex' to enable our centering styles.
}
