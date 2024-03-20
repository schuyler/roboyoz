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

async function startCall() {
  const name = $("input[name=name]") as HTMLInputElement;
  const token = await loadToken(name.value);
  device = new Device(token);
  call = await device.connect({});
  // Set up event listeners for the call
  call.on("disconnect", endCall);
  call.on("error", endCall);
  call.on("cancel", endCall);
  call.on("reject", endCall);
  call.on("disconnect", endCall);
}
// Function to disconnect the call
function endCall() {
  if (call && call.status() != "closed") {
    call.disconnect();
  }
  call = null;
}

// Toggle call state: if there is a call, end it; otherwise, start a call
// Set the connectButton text to "Connect" if there is no call, or "Disconnect" if there is a call
export function toggleCall() {
  if (call) {
    endCall();
    $("button[name=connect]").textContent = "Connect";
  } else {
    startCall();
    $("button[name=connect]").textContent = "Disconnect";
  }
}

// Function to send a DTMF tone to the call
export function sendDigit(digit: string) {
  call?.sendDigits(digit);
}

// Enable connectButton if the name input has a non-empty value
function enableConnect() {
  const name = $("input[name=name]") as HTMLInputElement;
  const connect = $("button[name=connect]") as HTMLButtonElement;
  connect.disabled = !name.value;
}

// Add event listeners to the name input and connect button
function addListeners() {
  const name = $("input[name=name]");
  const connect = $("button[name=connect]");
  name.addEventListener("input", enableConnect);
  connect.addEventListener("click", toggleCall);
}

// Add event listeners when the DOM is fully loaded
doc.addEventListener("DOMContentLoaded", addListeners);
