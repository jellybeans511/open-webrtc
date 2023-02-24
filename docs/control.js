const API_KEY = "e316eaa7-4c1c-468c-b23a-9ce51b074ab7";
//const username = window.prompt("Please input user name", "")
//const localVideoType = window.confirm("Is it okay to use the camera? \n If this answer is No, use schreen sharing");
//sa
const Peer = window.Peer;

(async function main() {
  let localVideo = document.getElementById('js-local-stream');
  const localId = document.getElementById('js-local-id');
  const makePeerTrigger = document.getElementById('js-makepeer-trigger');
  const captureTrigger = document.getElementById('js-startcapture-trigger');
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
  let peer = null;


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

  });

  let videoOptions = {
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
          /*deviceId: {
            exact: cameraOptions.value
          }*/
        }
      }).then(function (mediaStream) {
        localStream = mediaStream;
        localVideo.srcObject = mediaStream;
        localVideo.playsInline = true;
        localVideo.play().catch(console.error);
        videoTrack = localStream.getTracks()[0];
        videoTrack.contentHint = document.getElementById("js-video-content").value;
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
        videoTrack.contentHint = document.getElementById("js-video-content").value;
      });
    }

    // detail,motion,text
  })

  // Register caller handler
  callTrigger.addEventListener('click', () => {

    if (peer != null) {


      // Note that you need to ensure the peer has connected to signaling server
      // before using methods of peer instance.
      if (!peer.open) {
        return;
      }

      videoOptions.videoBandwidth = Number(document.getElementById('js-video-byte').value);
      videoOptions.videoCodec = String(document.getElementById('js-video-codec').value);

      let mediaConnection = peer.call(remoteId.value, localStream, videoOptions);

      mediaConnection.on('stream', async stream => {
        // Render remote stream for caller
        remoteVideo.srcObject = stream;
        remoteVideo.playsInline = true;
        await remoteVideo.play().catch(console.error);
      });

      mediaConnection.once('close', () => {
        remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        remoteVideo.srcObject = null;
      });

      let dataConnection = peer.connect(remoteId.value);

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

  // Register callee handler
  if (peer != null) {
    peer.on('call', mediaConnection => {
      console.log("Moriteu:", videoTrack.contentHint);

      videoOptions.videoBandwidth = Number(document.getElementById('js-video-byte').value);
      videoOptions.videoCodec = String(document.getElementById('js-video-codec').value);

      mediaConnection.answer(localStream, videoOptions);

      mediaConnection.on('stream', async stream => {
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
})();