import { Device, Call } from "@twilio/voice-sdk";

let device: Device,
  call: Call | null = null;
const doc: Document = document;
const tokenUrl = "https://interview.erlegrey.com/token";

// Alias doc.querySelector to $ for convenience
const $ = (selector: string) => doc.querySelector(selector) as HTMLElement;

async function loadToken(name: string): Promise<string> {
  // Download the access token from the tokenUrl using the fetch() API. Provide the identity as a query parameter.
  const response = await fetch(tokenUrl + `?identity=${name}`);
  const blob = await response.text();
  const args = JSON.parse(blob);
  return args.token;
}

// Function to start a call
async function startCall() {
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
    setConnectButton("Disconnect", true);
    enableNumberButtons(true);
  });
}
// Function to disconnect the call
function endCall() {
  if (call && call.status() != "closed") {
    call.disconnect();
  }
  call = null;
  setConnectButton("Connect", true);
  enableNumberButtons(false);
}

// Toggle call state: if there is a call, end it; otherwise, start a call
// Set the connectButton text to "Connect" if there is no call, or "Disconnect" if there is a call
export async function toggleCall() {
  if (call) {
    endCall();
  } else {
    startCall();
  }
}

function setConnectButton(label: string, enabled: boolean) {
  const connect = $("button[name=connect]") as HTMLButtonElement;
  connect.textContent = label;
  connect.disabled = !enabled;
  connect.style.color = enabled ? "white" : "grey";
}

// Function to send a DTMF tone to the call
export function sendDigit(digit: string) {
  console.log(`Sending digit: ${digit} to ${call?.parameters.To}`);
  call?.sendDigits(digit);
}

// Enable connectButton if the name input has a non-empty value
function enableConnectButton() {
  const name = $("input[name=name]") as HTMLInputElement;
  const connect = $("button[name=connect]") as HTMLButtonElement;
  const active = name.value || call;
  connect.style.color = active ? "white" : "grey";
  connect.disabled = !active;
}

// Enable all buttons and set their text color to white
function enableNumberButtons(active: boolean) {
  const connect = $("button[name=connect]") as HTMLButtonElement;
  connect.textContent = "Disconnect";
  connect.disabled = false;
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
}

// Add event listeners when the DOM is fully loaded
doc.addEventListener("DOMContentLoaded", addListeners);
