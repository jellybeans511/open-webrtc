const API_KEY = "94d5c621-415d-4003-a1be-822df987831f";
//const userName = window.prompt("Please input user name", "")
//const localVideoType = window.confirm("Is it okay to use the camera? \n If this answer is No, use schreen sharing");
//sa
const Peer = window.Peer;

(async function main() {
  let localVideo = document.getElementById('js-local-stream');
  const localId = document.getElementById('js-local-id');
  const makePeerTrigger = document.getElementById('js-makepeer-trigger');
  const captureTrigger = document.getElementById('js-startcapture-trigger');
  const deleteCapturteTrigger = document.getElementById('js-deletecapture-trigger');
  const callTrigger = document.getElementById('js-call-trigger');
  const closeTrigger = document.getElementById('js-close-trigger');
  const localText = document.getElementById('js-local-text');
  const sendTrigger = document.getElementById('js-send-trigger');
  const remoteVideo = document.getElementById('js-remote-stream');
  const remoteId = document.getElementById('js-remote-id');
  const messages = document.getElementById('js-messages');
  let videoDevicesElement = document.getElementById('video-device');
  let cameraOptions = document.querySelector('.video-options>select');
  let localVideoBox = document.getElementsByName('stream-type');
  let localVideoCodec = document.getElementById('js-video-codec').value;
  let localVideoType = 'camera';
  const meta = document.getElementById('js-meta');
  const sdkSrc = document.querySelector('script[src*=skyway]');
  let peer = null
  let targetDevice = null;
  let mediaConnection = null;
  let dataConnection = null;

  /*const peer = (window.peer = new Peer(userName, {
    key: API_KEY,
    debug: 3,
  }));*/

  makePeerTrigger.addEventListener('click', () => {
    var userName = document.getElementById('js-your-id').value;
    console.log(userName);
    peer = (window.peer = new Peer(userName,
      {
        key: API_KEY,
        debug: 3
      }
    ))
    //document.getElementById('js-local-id') = String(peer);
    peer.on('open', id => (localId.textContent = id));
    waitCall();
  });

  function populateCameras() {
    if (!("mediaDevices" in navigator)) return;
    navigator.mediaDevices.enumerateDevices().then(mediaDevices => {
      while (cameraSelect.options.length > 0) {
        cameraSelect.remove(0);
      }
      const defaultOption = document.createElement("option");
      defaultOption.id = "default";
      defaultOption.textContent = "(default camera) ";
      cameraSelect.appendChild(defaultOption);

      const videoInputDevices = mediaDevices.filter(
        mediaDevice => mediaDevice.kind == "videoinput"
      );
      if (videoInputDevices.length > 0) {
        cameraSelect.disabled = false;
      }
      videoInputDevices.forEach((videoInputDevice, index) => {
        if (!videoInputDevice.deviceId) {
          return;
        }
        const option = document.createElement("option");

        option.id = videoInputDevice.deviceId;
        option.textContent = videoInputDevice.label || `Camera ${index + 1}`;
        option.selected = deviceId == option.id;
        cameraSelect.appendChild(option);
      });
    });
  }

  window.addEventListener("DOMContentLoaded", populateCameras);
  if ("mediaDevices" in navigator) {
    navigator.mediaDevices.addEventListener("devicechange", populateCameras);
  }

  let deviceId = "default";
  cameraSelect.onchange = _ => {
    deviceId = cameraSelect.selectedOptions[0].id;
    targetDevice = deviceId
  };

  let videoCallOptions = {
    videoBandwidth: Number(document.getElementById('js-video-byte').value),
    videoCodec: String(document.getElementById('js-video-codec').value),
    audioCodec: "opus"
  };

  let localStream = null;
  let videoTrack = null;

  captureTrigger.addEventListener('click', () => {
    for (i = 0; i < localVideoBox.length; ++i) {
      if (localVideoBox[i].checked) {
        localVideoType = localVideoBox[i].value;
      }
    }
    if (localVideoType == 'camera') {
      navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: Number(document.getElementById('video-width').value),
          height: Number(document.getElementById('video-height').value),
          frameRate: Number(document.getElementById('video-rate').value),
          deviceId: String(targetDevice)
        }
      }).then(function (mediaStream) {
        localStream = mediaStream;
        localVideo.srcObject = mediaStream;
        localVideo.playsInline = true;
        localVideo.play().catch(console.error);
        videoTrack = localStream.getTracks()[0];
        var videoTrackSettings = videoTrack.getSettings();
        videoTrack.contentHint = document.getElementById("js-video-content").value;
        document.getElementById("js-estimated-latency").textContent =videoTrackSettings.latency;
        //console.log(targetDevice);
      })
    }
    else if (localVideoType == 'screen') {
      navigator.mediaDevices.getDisplayMedia({
        audio: false,
        video: {
          width: Number(document.getElementById('video-width').value),
          height: Number(document.getElementById('video-height').value),
          frameRate: Number(document.getElementById('video-rate').value)
        }
      }).then(function (mediaStream) {
        localStream = mediaStream;
        localVideo.srcObject = mediaStream;
        localVideo.playsInline = true;
        localVideo.play().catch(console.error);
        videoTrack = localStream.getTracks()[0];
        var videoTrackSettings = videoTrack.getSettings();
        videoTrack.contentHint = document.getElementById("js-video-content").value;
        document.getElementById("js-estimated-latency").textContent =videoTrackSettings.latency;
      });
    }

    // detail,motion,text
  })

  deleteCapturteTrigger.addEventListener('click', () => {
    localStream = null;
    localVideo.srcObject = null;
  })

  // Register caller handler
  callTrigger.addEventListener('click', () => {

    if (peer == null) {
      console.log('Peer is not opened');
    }
    if (peer != null) {
      // Note that you need to ensure the peer has connected to signaling server
      // before using methods of peer instance.
      /*if (!peer.open) {
        return;
      }*/

      videoCallOptions.videoBandwidth = Number(document.getElementById('js-video-byte').value);
      videoCallOptions.videoCodec = String(document.getElementById('js-video-codec').value);
      //console.log(videoCallOptions);
      mediaConnection = peer.call(remoteId.value, localStream, videoCallOptions);

      mediaConnection.on('stream', async (stream) => {
        console.log('MORATTAYO')
        // Render remote stream for caller
        remoteVideo.srcObject = stream;
        remoteVideo.playsInline = true;
        await remoteVideo.play().catch(console.error);
      });

      mediaConnection.once('close', () => {
        remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        remoteVideo.srcObject = null;
      });

      dataConnection = peer.connect(remoteId.value);

      dataConnection.once('open', async () => {
        messages.textContent += `=== DataConnection has been opened ===\n`;
        sendTrigger.addEventListener('click', onClickSend);
      });

      dataConnection.on('data', data => {
        messages.textContent += `${dataConnection.remoteId}: ${data}\n`;
      });

      dataConnection.once('close', () => {
        messages.textContent += `=== DataConnection has been closed ===\n`;
        sendTrigger.removeEventListener('click', onClickSend);

      });

      function onClickSend() {
        const data = localText.value;
        dataConnection.send(data);

        messages.textContent += `You: ${data}\n`;
        localText.value = '';
      }

      closeTrigger.addEventListener('click', () => mediaConnection.close(true));
    }
  });

  function estimateMediaLatency() {
    console.log("local stream is null");
    if (localStream != null) {
      var videoTrackOr = localStream.getVideoTrack()[0];
      var videoTrackSettings = videoTrackOr.getSettings();
      console.log("null de ha aniyo");
      if ("latency" in videoTrackSettings) {
       // local.getTracks;
        document.getElementById("js-estimated-latency").textContent = videoTrackSettings.latency;
        console.log("latency is arimasu");
      }
    }
  }

  setInterval((estimateMediaLatency,100))

  // Register callee handler
  function waitCall() {
    if (peer != null) {
      peer.on('call', mediaConnection => {

        let videoAnswerOptions = {
          videoBandwidth: Number(document.getElementById('js-video-byte').value),
          videoCodec: String(document.getElementById('js-video-codec').value),
          audioCodec: "opus"
        };
        videoAnswerOptions.videoBandwidth = Number(document.getElementById('js-video-byte').value);
        //videoAnswerOptions.videoCodec = String(document.getElementById('js-video-codec').value);
        //console.log(videoAnswerOptions);

        mediaConnection.answer(localStream, videoAnswerOptions);

        mediaConnection.on('stream', async (stream) => {
          // Render remote stream for callee
          remoteVideo.srcObject = stream;
          remoteVideo.playsInline = true;
          await remoteVideo.play().catch(console.error);
        });

        mediaConnection.once('close', () => {
          remoteVideo.srcObject.getTracks().forEach(track => track.stop());
          remoteVideo.srcObject = null;
        });

        closeTrigger.addEventListener('click', () => mediaConnection.close(true));
      });

      peer.on('connection', dataConnection => {
        dataConnection.once('open', async () => {
          messages.textContent += `=== DataConnection has been opened ===\n`;
          sendTrigger.addEventListener('click', onClickSend);
        });

        dataConnection.on('data', data => {
          messages.textContent += `${dataConnection.remoteId}: ${data}\n`;
        });

        dataConnection.once('close', () => {
          messages.textContent += `=== DataConnection has been closed ===\n`;
          sendTrigger.removeEventListener('click', onClickSend);
        });

        // Register closing handler
        closeTrigger.addEventListener('click', () => dataConnection.close(true), {
          once: true,
        });

        function onClickSend() {
          const data = localText.value;
          dataConnection.send(data);

          messages.textContent += `You: ${data}\n`;
          localText.value = '';
        }
      });
      peer.on('error', console.error);
    }
  }
}
)();