////////////////////////////////////////////////////////////////////////////////
// ARDUINO → delta values: (d1, d2, d3)
// drive knob angles directly
////////////////////////////////////////////////////////////////////////////////

let port = null;
let reader = null;
let isOpen = false;
let arduinoReady = false;
let serialBuffer = "";

async function connectSerial() {
  if (isOpen) return;

  port = await navigator.serial.requestPort();
  await port.open({ baudRate: 115200 });
  isOpen = true;

  const decoder = new TextDecoderStream();
  port.readable.pipeTo(decoder.writable);
  reader = decoder.readable.getReader();
  readSerialLoop();
}

function handleHardwareInput(msg) {
  const parts = msg.trim().split(",");
  if (parts.length !== 3) return;

  const d1 = parseInt(parts[0]);
  const d2 = parseInt(parts[1]);
  const d3 = parseInt(parts[2]);

  const ENC_SPEED = 0.05;

  window.knobs[0].angle += d1 * ENC_SPEED;
  window.knobs[1].angle += d2 * ENC_SPEED;
  window.knobs[2].angle += d3 * ENC_SPEED;
}

async function disconnectSerial() {
  if (!isOpen) return;
  if (reader) {
    await reader.cancel();
    await reader.releaseLock();
  }
  if (port) await port.close();

  port = null;
  reader = null;
  isOpen = false;
}

document.getElementById("connectBtn").onclick = async () => {
  if (!isOpen) {
    await connectSerial();
    connectBtn.textContent = "Disconnect";
  } else {
    await disconnectSerial();
    connectBtn.textContent = "Connect";
  }
};

async function readSerialLoop() {
  while (isOpen) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;

    serialBuffer += value;
    let lines = serialBuffer.split("\n");
    serialBuffer = lines.pop();

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      console.log("LINE:", line);

      handleHardwareInput(line);
      arduinoReady = true;
    }
  }
}

