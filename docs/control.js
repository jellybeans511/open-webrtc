const API_KEY = "e316eaa7-4c1c-468c-b23a-9ce51b074ab7";
//const username = window.prompt("Please input user name", "")
//const localVideoType = window.confirm("Is it okay to use the camera? \n If this answer is No, use schreen sharing");
//sa
const Peer = window.Peer;

(async function main() {
  let localVideo = document.getElementById("js-local-stream");
  const localId = document.getElementById("js-local-id");
  const makePeerTrigger = document.getElementById("js-makepeer-trigger");
  const captureTrigger = document.getElementById("js-startcapture-trigger");
  const callTrigger = document.getElementById("js-call-trigger");
  const closeTrigger = document.getElementById("js-close-trigger");
  const localText = document.getElementById("js-local-text");
  const sendTrigger = document.getElementById("js-send-trigger");
  const remoteVideo = document.getElementById("js-remote-stream");
  const remoteId = document.getElementById("js-remote-id");
  const messages = document.getElementById("js-messages");
  let videoDevicesElement = document.getElementById("video-device");
  let cameraOptions = document.querySelector(".device-select");
  let micOptions = document.querySelector(".mic-select");
  let localVideoBox = document.getElementsByName("stream-type");
  let audioSettingBox = document.getElementsByName("audio-setting");
  let localVideoCodec = document.getElementById("js-video-codec").value;
  let localVideoType = "camera";
  const meta = document.getElementById("js-meta");
  const sdkSrc = document.querySelector("script[src*=skyway]");
  let peer = null;

  makePeerTrigger.addEventListener("click", () => {
    var userName = document.getElementById("js-your-id").value;
    console.log(userName);
    peer = window.peer = new Peer(userName, {
      key: API_KEY,
      debug: 3,
    });
    //document.getElementById('js-local-id') = String(peer);
    peer.on("open", (id) => (localId.textContent = id));
  });

  // Enumerate camera and microphone devices
  async function enumerateDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      // Filter cameras
      availableCameras = devices.filter(device => device.kind === 'videoinput');
      cameraOptions.innerHTML = '<option value="">Select camera</option>';
      availableCameras.forEach((device, index) => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.text = device.label || `Camera ${index + 1}`;
        cameraOptions.appendChild(option);
      });
      
      // Filter microphones
      availableMicrophones = devices.filter(device => device.kind === 'audioinput');
      micOptions.innerHTML = '<option value="">Select microphone</option>';
      availableMicrophones.forEach((device, index) => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.text = device.label || `Microphone ${index + 1}`;
        micOptions.appendChild(option);
      });
      
      console.log(`Found ${availableCameras.length} camera devices:`, availableCameras);
      console.log(`Found ${availableMicrophones.length} microphone devices:`, availableMicrophones);
    } catch (error) {
      console.error('Error enumerating devices:', error);
    }
  }

  // Initialize device enumeration when page loads
  enumerateDevices();

  let videoOptions = {
    videoBandwidth: Number(document.getElementById("js-video-byte").value),
    videoCodec: String(document.getElementById("js-video-codec").value),
    audioCodec: "opus",
  };

  let localStream = null;
  let videoTrack = null;
  let ptzSupported = false;
  let availableCameras = [];
  let availableMicrophones = [];
  let currentAudioSetting = "on";

  captureTrigger.addEventListener("click", () => {
    for (i = 0; i < localVideoBox.length; ++i) {
      if (localVideoBox[i].checked) {
        localVideoType = localVideoBox[i].value;
      }
    }
    
    // Get current audio setting
    for (i = 0; i < audioSettingBox.length; ++i) {
      if (audioSettingBox[i].checked) {
        currentAudioSetting = audioSettingBox[i].value;
      }
    }
    if (localVideoType == "camera") {
      // Get selected device IDs
      const selectedCameraId = cameraOptions.value;
      const selectedMicId = micOptions.value;
      
      const videoConstraints = {
        width: Number(document.getElementById("video-width").value),
        height: Number(document.getElementById("video-height").value),
        frameRate: Number(document.getElementById("video-rate").value),
      };
      
      // Add deviceId constraint if a specific camera is selected
      if (selectedCameraId) {
        videoConstraints.deviceId = { exact: selectedCameraId };
        console.log("Using specific camera device:", selectedCameraId);
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
          videoTrack = localStream.getVideoTracks()[0];
          videoTrack.contentHint =
            document.getElementById("js-video-content").value;
          
          // Check PTZ capabilities
          checkPTZSupport();
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
          videoTrack = localStream.getVideoTracks()[0];
          videoTrack.contentHint =
            document.getElementById("js-video-content").value;
        });
    }

    // detail,motion,text
  });

  // PTZ capability check function
  async function checkPTZSupport() {
    if (!videoTrack) return;
    
    try {
      const capabilities = videoTrack.getCapabilities();
      ptzSupported = !!(capabilities.pan || capabilities.tilt || capabilities.zoom);
      console.log("PTZ Support:", ptzSupported);
      console.log("PTZ Capabilities:", {
        pan: capabilities.pan,
        tilt: capabilities.tilt,
        zoom: capabilities.zoom
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
        advanced: [constraints]
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
      audioTracks.forEach(track => {
        track.stop();
        localStream.removeTrack(track);
      });
    } else if (enabled && audioTracks.length > 0) {
      // Enable existing audio tracks
      audioTracks.forEach(track => track.enabled = true);
    } else {
      console.log("Audio state already matches request");
    }
  }

  async function restartStreamWithAudio() {
    if (!localStream) return;
    
    const selectedMicId = micOptions.value;
    const audioConstraints = {};
    if (selectedMicId) {
      audioConstraints.deviceId = { exact: selectedMicId };
    }

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false
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

  // Audio setting change listener
  audioSettingBox.forEach(radio => {
    radio.addEventListener('change', (event) => {
      if (event.target.checked) {
        const newSetting = event.target.value;
        if (newSetting !== currentAudioSetting) {
          currentAudioSetting = newSetting;
          toggleAudio(newSetting === "on");
        }
      }
    });
  });

  // Expose PTZ functions globally for easy access
  window.ptzControl = {
    isPTZSupported: () => ptzSupported,
    setPan: (value) => applyPTZConstraints(value, undefined, undefined),
    setTilt: (value) => applyPTZConstraints(undefined, value, undefined),
    setZoom: (value) => applyPTZConstraints(undefined, undefined, value),
    setPTZ: (pan, tilt, zoom) => applyPTZConstraints(pan, tilt, zoom)
  };

  // Expose audio control functions globally
  window.audioControl = {
    toggleAudio: (enabled) => toggleAudio(enabled),
    getCurrentAudioSetting: () => currentAudioSetting
  };

  // Register caller handler
  callTrigger.addEventListener("click", () => {
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
  if (peer != null) {
    peer.on("call", (mediaConnection) => {
      console.log(mediaConnection.getstats());
      console.log("Moriteu:", videoTrack.contentHint);

      videoOptions.videoBandwidth = Number(
        document.getElementById("js-video-byte").value
      );
      videoOptions.videoCodec = String(
        document.getElementById("js-video-codec").value
      );

      mediaConnection.answer(localStream, videoOptions);

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

      closeTrigger.addEventListener("click", () => mediaConnection.close(true));
    });

    peer.on("connection", (dataConnection) => {
      console.log(Peer.getstats());
      dataConnection.once("open", async () => {
        messages.textContent += `=== DataConnection has been opened ===\n`;
        sendTrigger.addEventListener("click", onClickSend);
      });

      dataConnection.on("data", (data) => {
        messages.textContent += `${dataConnection.remoteId}: ${data}\n`;
        console.log(mediaConnection.getstats());
        function statsConsole() {
          console.log(mediaConnection.getstats());
        }
        setInterval(() => statsConsole, 1000);
      });

      dataConnection.once("close", () => {
        messages.textContent += `=== DataConnection has been closed ===\n`;
        sendTrigger.removeEventListener("click", onClickSend);
      });

      // Register closing handler
      closeTrigger.addEventListener("click", () => dataConnection.close(true), {
        once: true,
      });

      function onClickSend() {
        const data = localText.value;
        dataConnection.send(data);

        messages.textContent += `You: ${data}\n`;
        localText.value = "";
      }
    });

    peer.on("error", console.error);
  }
})();
