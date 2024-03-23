import { Device, Call } from "@twilio/voice-sdk";

let device: Device,
  call: Call | null = null,
  status: "disconnected" | "connecting" | "connected" = "disconnected";
const doc: Document = document;
const tokenUrl = "https://interview.erlegrey.com/token";

// Alias doc.querySelector to $ for convenience
const $ = (selector: string) => doc.querySelector(selector) as HTMLElement;

async function loadToken(name: string): Promise<string> {
  // Download the access token from the tokenUrl using the fetch() API. Provide the identity as a query parameter.
  const identity = encodeURIComponent(name);
  const response = await fetch(tokenUrl + `?name=${identity}`);
  const blob = await response.text();
  const args = JSON.parse(blob);
  return args.token;
}

// Function to start a call
async function startCall() {
  if (status != "disconnected") {
    return;
  }
  status = "connecting";
  console.log("Call status:", status);
  try {
    if (!(await checkMicAccess())) {
      throw new Error("No microphone access");
    }

    const name = $("input[name=name]") as HTMLInputElement;
    if (!name.value) {
      throw new Error("Name is required");
    }
    const token = await loadToken(name.value);
    device = new Device(token);
    if (!device) {
      throw new Error("Device not initialized");
    }

    // Set an event on the device to refresh the token when it expires
    device.on("tokenAboutToExpire", async () => {
      console.log("Refreshing token...");
      device.updateToken(await loadToken(name.value));
    });

    setConnectButton("Connecting...", false);
    call = await device.connect({});
    // Set up event listeners for the call
    call.on("disconnect", endCall);
    call.on("error", endCall);
    call.on("cancel", endCall);
    call.on("reject", endCall);
    // When the call is fully active, enable the number buttons
    call.on("accept", () => {
      status = "connected";
      console.log("Call status:", status);
      setConnectButton("Disconnect", true);
      enableNumberButtons(true);
    });
  } catch (error: any) {
    console.error("startCall error", error);
    endCall();
  }
}
// Function to disconnect the call
function endCall() {
  if (status == "disconnected") {
    return;
  }
  status = "disconnected";
  console.log("Call status:", status);
  if (call && call.status() != "closed") {
    call.disconnect();
  }
  call = null;
  enableConnectButton();
  enableNumberButtons(false);
}

// Toggle call state: if there is a call, end it; otherwise, start a call
async function toggleCall() {
  if (status == "disconnected") {
    startCall();
  } else {
    endCall();
  }
}

async function checkMicAccess() {
  // Check to make sure we have rights to use the microphone
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    alert("🎙️ Please allow microphone access to talk to RoboYoz! ❤️ 🎙️");
    return false;
  }
  return true;
}

function setConnectButton(label: string | null, enabled: boolean) {
  const connect = $("button[name=connect]") as HTMLButtonElement;
  if (label) {
    connect.textContent = label;
  }
  connect.disabled = !enabled;
  connect.style.color = enabled ? "white" : "grey";
}

// Function to send a DTMF tone to the call
export function sendDigit(digit: string) {
  call?.sendDigits(digit);
}

// Enable connectButton if the name input has a non-empty value
function enableConnectButton() {
  const name = $("input[name=name]") as HTMLInputElement;
  if (status == "disconnected") {
    setConnectButton("Connect", !!name.value);
  }
}

// Enable all buttons and set their text color to white
function enableNumberButtons(active: boolean) {
  // select all buttons not named "connect
  const buttons = Array.from(
    doc.querySelectorAll("button:not([name=connect])"),
  ) as HTMLButtonElement[];
  buttons.forEach((button) => {
    button.style.color = active ? "white" : "grey";
    button.disabled = !active;
  });
}

// Add event listeners to the name input and connect button
function addListeners() {
  const name = $("input[name=name]");
  const connect = $("button[name=connect]");
  name.addEventListener("input", enableConnectButton);
  // Add an event listener to the connect button to toggle the call any time the button is clicked
  connect.addEventListener("click", toggleCall);
  // Add event listeners to the number buttons to send the corresponding digit
  Array.from(doc.querySelectorAll("button[name=digit]")).forEach((button) => {
    // Copy the digit from the button text content but strip any non DTMF characters
    const digit = button.textContent?.replace(/[^0-9*#]/g, "");
    button.addEventListener("click", () => digit && sendDigit(digit));
  });
  checkMicAccess();
}

// Add event listeners when the DOM is fully loaded
doc.addEventListener("DOMContentLoaded", addListeners);
