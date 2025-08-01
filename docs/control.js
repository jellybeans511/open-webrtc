const API_KEY = "94d5c621-415d-4003-a1be-822df987831f";
//const username = window.prompt("Please input user name", "")
//const localVideoType = window.confirm("Is it okay to use the camera? \n If this answer is No, use schreen sharing");
//sa
const Peer = window.Peer;

(async function main() {
  let localVideo = document.getElementById("js-local-stream");
  const localId = document.getElementById("js-local-id");
  const makePeerTrigger = document.getElementById("js-makepeer-trigger");
  const captureTrigger = document.getElementById("js-startcapture-trigger");
  const deleteCapturteTrigger = document.getElementById(
    "js-deletecapture-trigger"
  );
  const callTrigger = document.getElementById("js-call-trigger");
  const closeTrigger = document.getElementById("js-close-trigger");
  const localText = document.getElementById("js-local-text");
  const sendTrigger = document.getElementById("js-send-trigger");
  const remoteVideo = document.getElementById("js-remote-stream");
  const remoteId = document.getElementById("js-remote-id");
  const messages = document.getElementById("js-messages");
  let videoDevicesElement = document.getElementById("video-device");
  let cameraOptions = document.getElementById("cameraSelect");
  let micOptions = document.querySelector(".mic-select");

  console.log("Camera select element:", cameraOptions);
  console.log("Mic select element:", micOptions);
  let localVideoBox = document.getElementsByName("stream-type");
  let audioSettingBox = document.getElementsByName("audio-setting");
  let localVideoCodec = document.getElementById("js-video-codec").value;
  let localVideoType = "camera";
  const meta = document.getElementById("js-meta");
  const sdkSrc = document.querySelector("script[src*=skyway]");
  let peer = null;
  let targetDevice = null;
  let mediaConnection = null;
  let dataConnection = null;
  let videoTrack;
  var videoTrackSettings;
  var capabilities;

  let localStream = null;
  let ptzSupported = false;
  let availableCameras = [];
  let availableMicrophones = [];
  let currentAudioSetting = "on";

  makePeerTrigger.addEventListener("click", () => {
    var userName = document.getElementById("js-your-id").value;
    console.log(userName);
    peer = window.peer = new Peer(userName, {
      key: API_KEY,
      debug: 3,
    });
    //document.getElementById('js-local-id') = String(peer);
    peer.on("open", (id) => (localId.textContent = id));
    waitCall();
  });

  // Get available media devices - based on WebRTC samples
  async function getDevices() {
    try {
      console.log("Calling navigator.mediaDevices.enumerateDevices()...");
      const deviceInfos = await navigator.mediaDevices.enumerateDevices();
      console.log("Raw device enumeration result:", deviceInfos);
      console.log("Total devices found:", deviceInfos.length);

      // Count devices by type
      const deviceCounts = deviceInfos.reduce((counts, device) => {
        counts[device.kind] = (counts[device.kind] || 0) + 1;
        return counts;
      }, {});
      console.log("Device counts by type:", deviceCounts);

      gotDevices(deviceInfos);
    } catch (error) {
      console.error("Error enumerating devices:", error);
    }
  }

  // Process device information and populate selectors
  function gotDevices(deviceInfos) {
    console.log("Processing devices:", deviceInfos);

    // Clear existing options
    if (cameraOptions) {
      while (cameraOptions.firstChild) {
        cameraOptions.removeChild(cameraOptions.firstChild);
      }
    }
    if (micOptions) {
      while (micOptions.firstChild) {
        micOptions.removeChild(micOptions.firstChild);
      }
    }

    // Reset arrays
    availableCameras = [];
    availableMicrophones = [];

    // Add default options
    if (cameraOptions) {
      const defaultVideoOption = document.createElement("option");
      defaultVideoOption.value = "";
      defaultVideoOption.text = "Select camera";
      cameraOptions.appendChild(defaultVideoOption);
    }

    if (micOptions) {
      const defaultAudioOption = document.createElement("option");
      defaultAudioOption.value = "";
      defaultAudioOption.text = "Select microphone";
      micOptions.appendChild(defaultAudioOption);
    }

    // Process each device
    for (let i = 0; i !== deviceInfos.length; ++i) {
      const deviceInfo = deviceInfos[i];
      console.log(`Device ${i}:`, {
        kind: deviceInfo.kind,
        label: deviceInfo.label,
        deviceId: deviceInfo.deviceId,
        groupId: deviceInfo.groupId,
      });

      const option = document.createElement("option");
      option.value = deviceInfo.deviceId;

      if (deviceInfo.kind === "audioinput") {
        option.text =
          deviceInfo.label || `Microphone ${availableMicrophones.length + 1}`;
        availableMicrophones.push(deviceInfo);
        console.log("Adding microphone option:", option.text, option.value);
        if (micOptions) {
          micOptions.appendChild(option);
          console.log("Microphone option added to select element");
        } else {
          console.log("micOptions element not found!");
        }
      } else if (deviceInfo.kind === "videoinput") {
        option.text =
          deviceInfo.label || `Camera ${availableCameras.length + 1}`;
        availableCameras.push(deviceInfo);
        console.log("Adding camera option:", option.text, option.value);
        console.log("Camera option element:", option);
        console.log("cameraOptions element exists:", !!cameraOptions);
        if (cameraOptions) {
          console.log(
            "Before appendChild - cameraOptions children count:",
            cameraOptions.children.length
          );
          cameraOptions.appendChild(option);
          console.log(
            "After appendChild - cameraOptions children count:",
            cameraOptions.children.length
          );
          console.log("Camera option added to select element");
        } else {
          console.log("cameraOptions element not found!");
        }
      } else {
        console.log("Ignoring device kind:", deviceInfo.kind);
      }
    }

    console.log("Final device counts:");
    console.log("availableCameras array:", availableCameras);
    console.log("availableMicrophones array:", availableMicrophones);
    console.log(
      "cameraOptions final children count:",
      cameraOptions ? cameraOptions.children.length : "element not found"
    );
    console.log(
      "micOptions final children count:",
      micOptions ? micOptions.children.length : "element not found"
    );

    console.log(
      `Found ${availableCameras.length} cameras and ${availableMicrophones.length} microphones`
    );

    // Check if we have permission (devices will have labels if we do)
    const hasPermission = deviceInfos.some((device) => device.label !== "");
    if (!hasPermission) {
      console.log(
        "No media permissions - requesting access to get device labels"
      );
      requestPermissionAndEnumerate();
    }
  }

  // Request permission and re-enumerate to get proper device labels
  async function requestPermissionAndEnumerate() {
    try {
      // Request basic permission without specific device constraints for initial enumeration
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      console.log("Permission granted, re-enumerating devices...");

      // Stop the stream immediately as we only needed it for permission
      stream.getTracks().forEach((track) => track.stop());

      // Re-enumerate now that we have permission
      await getDevices();
    } catch (error) {
      console.log("Permission denied or error:", error);
    }
  }

  // Combined device enumeration function for compatibility
  async function enumerateDevices() {
    console.log("Starting device enumeration...");
    console.log("Camera options element exists:", !!cameraOptions);
    console.log("Mic options element exists:", !!micOptions);

    await getDevices();
  }

  // Camera select event handler for compatibility
  if (cameraOptions) {
    cameraOptions.onchange = (_) => {
      const selectedOption = cameraOptions.selectedOptions[0];
      if (selectedOption) {
        targetDevice = selectedOption.id || selectedOption.value;
      }
    };
  }

  // Initialize device enumeration when page loads
  enumerateDevices();

  // Listen for device changes
  if ("mediaDevices" in navigator) {
    navigator.mediaDevices.addEventListener("devicechange", enumerateDevices);
  }

  let videoOptions = {
    videoBandwidth: Number(document.getElementById("js-video-byte").value),
    videoCodec: String(document.getElementById("js-video-codec").value),
    audioCodec: "opus",
  };

  captureTrigger.addEventListener("click", () => {
    for (i = 0; i < localVideoBox.length; ++i) {
      if (localVideoBox[i].checked) {
        localVideoType = localVideoBox[i].value;
      }
    }

    // Get current audio setting if audio controls exist
    if (audioSettingBox && audioSettingBox.length > 0) {
      for (i = 0; i < audioSettingBox.length; ++i) {
        if (audioSettingBox[i].checked) {
          currentAudioSetting = audioSettingBox[i].value;
        }
      }
    }

    if (localVideoType == "camera") {
      // Get selected device IDs
      const selectedCameraId = cameraOptions
        ? cameraOptions.value || targetDevice
        : null;
      const selectedMicId = micOptions ? micOptions.value : null;

      const videoConstraints = {
        width: Number(document.getElementById("video-width").value),
        height: Number(document.getElementById("video-height").value),
        frameRate: Number(document.getElementById("video-rate").value),
        pan: true,
        tilt: true,
        zoom: true,
      };

      // Add deviceId constraint if a specific camera is selected
      if (selectedCameraId) {
        videoConstraints.deviceId = { exact: selectedCameraId };
        console.log(
          "Using specific camera device with exact constraint:",
          selectedCameraId
        );
      } else {
        console.log("Using default camera device");
      }

      // Setup audio constraints
      let audioConstraints = false;
      if (currentAudioSetting === "on") {
        audioConstraints = {};
        if (selectedMicId) {
          audioConstraints.deviceId = { exact: selectedMicId };
          console.log("Using specific microphone device:", selectedMicId);
        } else {
          console.log("Using default microphone device");
        }
      } else {
        console.log("Audio disabled");
      }

      navigator.mediaDevices
        .getUserMedia({
          audio: audioConstraints,
          video: videoConstraints,
        })
        .then(function (mediaStream) {
          localStream = mediaStream;
          localVideo.srcObject = mediaStream;
          localVideo.playsInline = true;
          localVideo.play().catch(console.error);

          // Get video track - handle both audio and video tracks
          const videoTracks = localStream.getVideoTracks();
          if (videoTracks.length > 0) {
            videoTrack = videoTracks[0];
            videoTrackSettings = videoTrack.getSettings();
            capabilities = videoTrack.getCapabilities();
            videoTrack.contentHint =
              document.getElementById("js-video-content").value;

            // Display latency if element exists
            const latencyElement = document.getElementById(
              "js-estimated-latency"
            );
            if (latencyElement && videoTrackSettings.latency) {
              latencyElement.textContent = videoTrackSettings.latency;
            }

            // Check PTZ capabilities
            checkPTZSupport();
          }

          console.log(
            "Stream started with device:",
            selectedCameraId || "default"
          );
        });
    } else if (localVideoType == "screen") {
      navigator.mediaDevices
        .getDisplayMedia({
          audio: false,
          video: {
            width: Number(document.getElementById("video-width").value),
            height: Number(document.getElementById("video-height").value),
            frameRate: Number(document.getElementById("video-rate").value),
          },
        })
        .then(function (mediaStream) {
          localStream = mediaStream;
          localVideo.srcObject = mediaStream;
          localVideo.playsInline = true;
          localVideo.play().catch(console.error);

          const videoTracks = localStream.getVideoTracks();
          if (videoTracks.length > 0) {
            videoTrack = videoTracks[0];
            var videoTrackSettings = videoTrack.getSettings();
            videoTrack.contentHint =
              document.getElementById("js-video-content").value;

            const latencyElement = document.getElementById(
              "js-estimated-latency"
            );
            if (latencyElement && videoTrackSettings.latency) {
              latencyElement.textContent = videoTrackSettings.latency;
            }
          }
        });
    }

    // detail,motion,text
  });

  // Delete capture trigger
  if (deleteCapturteTrigger) {
    deleteCapturteTrigger.addEventListener("click", () => {
      localStream = null;
      localVideo.srcObject = null;
    });
  }

  // PTZ capability check function
  async function checkPTZSupport() {
    if (!videoTrack) return;

    try {
      const capabilities = videoTrack.getCapabilities();
      ptzSupported = !!(
        capabilities.pan ||
        capabilities.tilt ||
        capabilities.zoom
      );
      console.log("PTZ Support:", ptzSupported);
      console.log("PTZ Capabilities:", {
        pan: capabilities.pan,
        tilt: capabilities.tilt,
        zoom: capabilities.zoom,
      });
    } catch (error) {
      console.log("PTZ capability check failed:", error);
      ptzSupported = false;
    }
  }

  // PTZ control functions
  async function applyPTZConstraints(pan, tilt, zoom) {
    if (!ptzSupported || !videoTrack) {
      console.log("PTZ not supported or no video track available");
      return;
    }

    try {
      const constraints = {};

      if (pan !== undefined) constraints.pan = pan;
      if (tilt !== undefined) constraints.tilt = tilt;
      if (zoom !== undefined) constraints.zoom = zoom;

      await videoTrack.applyConstraints({
        advanced: [constraints],
      });

      console.log("PTZ constraints applied:", constraints);
    } catch (error) {
      console.error("Failed to apply PTZ constraints:", error);
    }
  }

  // Audio control functions
  async function toggleAudio(enabled) {
    if (!localStream) {
      console.log("No active stream to toggle audio");
      return;
    }

    const audioTracks = localStream.getAudioTracks();

    if (enabled && audioTracks.length === 0) {
      // Need to add audio track - restart stream with audio
      console.log("Adding audio to stream");
      await restartStreamWithAudio();
    } else if (!enabled && audioTracks.length > 0) {
      // Remove audio tracks
      console.log("Removing audio from stream");
      audioTracks.forEach((track) => {
        track.stop();
        localStream.removeTrack(track);
      });
    } else if (enabled && audioTracks.length > 0) {
      // Enable existing audio tracks
      audioTracks.forEach((track) => (track.enabled = true));
    } else {
      console.log("Audio state already matches request");
    }
  }

  async function restartStreamWithAudio() {
    if (!localStream) return;

    const selectedMicId = micOptions ? micOptions.value : null;
    const audioConstraints = {};
    if (selectedMicId) {
      audioConstraints.deviceId = { exact: selectedMicId };
    }

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false,
      });

      const audioTrack = audioStream.getAudioTracks()[0];
      if (audioTrack) {
        localStream.addTrack(audioTrack);
        console.log("Audio track added to existing stream");
      }
    } catch (error) {
      console.error("Failed to add audio track:", error);
    }
  }

  // Audio setting change listener - only if audio controls exist
  if (audioSettingBox && audioSettingBox.length > 0) {
    audioSettingBox.forEach((radio) => {
      radio.addEventListener("change", (event) => {
        if (event.target.checked) {
          const newSetting = event.target.value;
          if (newSetting !== currentAudioSetting) {
            currentAudioSetting = newSetting;
            toggleAudio(newSetting === "on");
          }
        }
      });
    });
  }

  // Legacy PTZ adjustment function for compatibility
  let inputPan = 0;
  let inputTilt = 0;
  let inputZoom = 0;

  function adjustPTZ() {
    if (videoTrack == null) {
      console.log("local stream is null");
    } else if (videoTrack != null) {
      if (
        "pan" in videoTrackSettings ||
        "tilt" in videoTrackSettings ||
        "zoom" in videoTrackSettings
      ) {
        const panElement = document.getElementById("video-pan");
        const tiltElement = document.getElementById("video-tilt");
        const zoomElement = document.getElementById("video-zoom");

        if (panElement && tiltElement && zoomElement) {
          inputPan = Number(panElement.value) * 3600;
          inputTilt = Number(tiltElement.value) * 3600;
          inputZoom = Number(zoomElement.value);

          let ptzConstraints = {
            advanced: [
              {
                pan: inputPan,
                tilt: inputTilt,
                zoom: inputZoom,
              },
            ],
          };

          videoTrack
            .applyConstraints(ptzConstraints)
            .then(() => {
              console.log("PTZ constraints applied successfully");
            })
            .catch((err) => {
              console.error("Error applying PTZ constraints:", err);
            });
        }
      }
    }
  }

  function estimateMediaLatency() {
    if (localStream != null) {
      // Legacy compatibility function - latency is now handled in capture
    }
  }

  // Start periodic functions
  setInterval(estimateMediaLatency, 100);
  setInterval(adjustPTZ, 33);

  // Register caller handler
  callTrigger.addEventListener("click", () => {
    if (peer == null) {
      console.log("Peer is not opened");
      return;
    }
    if (peer != null) {
      // Note that you need to ensure the peer has connected to signaling server
      // before using methods of peer instance.
      if (!peer.open) {
        return;
      }

      videoOptions.videoBandwidth = Number(
        document.getElementById("js-video-byte").value
      );
      videoOptions.videoCodec = String(
        document.getElementById("js-video-codec").value
      );

      var mediaConnection = peer.call(
        remoteId.value,
        localStream,
        videoOptions
      );

      mediaConnection.on("stream", async (stream) => {
        // Render remote stream for caller
        remoteVideo.srcObject = stream;
        remoteVideo.playsInline = true;
        await remoteVideo.play().catch(console.error);
      });

      mediaConnection.once("close", () => {
        remoteVideo.srcObject.getTracks().forEach((track) => track.stop());
        remoteVideo.srcObject = null;
      });

      let dataConnection = peer.connect(remoteId.value);

      dataConnection.once("open", async () => {
        messages.textContent += `=== DataConnection has been opened ===\n`;
        sendTrigger.addEventListener("click", onClickSend);
      });

      dataConnection.on("data", (data) => {
        messages.textContent += `${dataConnection.remoteId}: ${data}\n`;
      });

      dataConnection.once("close", () => {
        messages.textContent += `=== DataConnection has been closed ===\n`;
        sendTrigger.removeEventListener("click", onClickSend);
      });

      function onClickSend() {
        const data = localText.value;
        dataConnection.send(data);

        messages.textContent += `You: ${data}\n`;
        localText.value = "";
      }

      closeTrigger.addEventListener("click", () => mediaConnection.close(true));
    }
  });

  // Register callee handler
  function waitCall() {
    if (peer != null) {
      peer.on("call", (mediaConnection) => {
        let videoAnswerOptions = {
          videoBandwidth: Number(
            document.getElementById("js-video-byte").value
          ),
          videoCodec: String(document.getElementById("js-video-codec").value),
          audioCodec: "opus",
        };

        mediaConnection.answer(localStream, videoAnswerOptions);

        mediaConnection.on("stream", async (stream) => {
          // Render remote stream for callee
          remoteVideo.srcObject = stream;
          remoteVideo.playsInline = true;
          await remoteVideo.play().catch(console.error);
        });

        mediaConnection.once("close", () => {
          remoteVideo.srcObject.getTracks().forEach((track) => track.stop());
          remoteVideo.srcObject = null;
        });

        closeTrigger.addEventListener("click", () =>
          mediaConnection.close(true)
        );
      });

      peer.on("connection", (dataConnection) => {
        dataConnection.once("open", async () => {
          messages.textContent += `=== DataConnection has been opened ===\n`;
          sendTrigger.addEventListener("click", onClickSend);
        });

        dataConnection.on("data", (data) => {
          messages.textContent += `${dataConnection.remoteId}: ${data}\n`;
          // Remote PTZ control
          if (data.match("pan")) {
            var splitPan = data.split(",");
            const panElement = document.getElementById("video-pan");
            if (panElement) {
              panElement.value = splitPan[1];
              console.log("Pan was adjusted");
            }
          } else if (data.match("tilt")) {
            var splitTilt = data.split(",");
            const tiltElement = document.getElementById("video-tilt");
            if (tiltElement) {
              tiltElement.value = splitTilt[1];
              console.log("Tilt was adjusted");
            }
          } else if (data.match("zoom")) {
            var splitZoom = data.split(",");
            const zoomElement = document.getElementById("video-zoom");
            if (zoomElement) {
              zoomElement.value = splitZoom[1];
              console.log("Zoom was adjusted");
            }
          }
        });

        dataConnection.once("close", () => {
          messages.textContent += `=== DataConnection has been closed ===\n`;
          sendTrigger.removeEventListener("click", onClickSend);
        });

        // Register closing handler
        closeTrigger.addEventListener(
          "click",
          () => dataConnection.close(true),
          {
            once: true,
          }
        );

        function onClickSend() {
          const data = localText.value;
          dataConnection.send(data);

          messages.textContent += `You: ${data}\n`;
          localText.value = "";
        }
      });
      peer.on("error", console.error);
    }
  }

  // Expose PTZ functions globally for easy access
  window.ptzControl = {
    isPTZSupported: () => ptzSupported,
    setPan: (value) => applyPTZConstraints(value, undefined, undefined),
    setTilt: (value) => applyPTZConstraints(undefined, value, undefined),
    setZoom: (value) => applyPTZConstraints(undefined, undefined, value),
    setPTZ: (pan, tilt, zoom) => applyPTZConstraints(pan, tilt, zoom),
  };

  // Expose audio control functions globally
  window.audioControl = {
    toggleAudio: (enabled) => toggleAudio(enabled),
    getCurrentAudioSetting: () => currentAudioSetting,
  };
})();
