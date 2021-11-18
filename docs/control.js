const API_KEY = "e316eaa7-4c1c-468c-b23a-9ce51b074ab7";
const username = window.prompt("Please input user name", "")
//const localVideoType = window.confirm("Is it okay to use the camera? \n If this answer is No, use schreen sharing");

const Peer = window.Peer;

(async function main() {
  let localVideo = document.getElementById('js-local-stream');
  const localId = document.getElementById('js-local-id');
  const captureTrigger = document.getElementById('js-startcapture-trigger');
  const callTrigger = document.getElementById('js-call-trigger');
  const closeTrigger = document.getElementById('js-close-trigger');
  const localText = document.getElementById('js-local-text');
  const sendTrigger = document.getElementById('js-send-trigger');
  const remoteVideo = document.getElementById('js-remote-stream');
  const remoteId = document.getElementById('js-remote-id');
  const messages = document.getElementById('js-messages');
  let localVideoBox = document.getElementsByName('stream-type');
  let localVideoCodec = document.getElementById('video-codec').value;
  let localVideoType = 'camera';
  const meta = document.getElementById('js-meta');
  const sdkSrc = document.querySelector('script[src*=skyway]');

  const peer = (window.peer = new Peer(username, {
    key: API_KEY,
    debug: 3,
  }));

  let mediaStream=null;

  captureTrigger.addEventListener('click', () => {
    for (i = 0; i < localVideoBox.length; ++i) {
      if(localVideoBox[i].checked) {
        localVideoType = localVideoBox[i].value;
      }
    }
    if (localVideoType == 'camera') {
      navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          width: Number(document.getElementById('video-width').value),
          height: Number(document.getElementById('video-height').value),
          frameRate: Number(document.getElementById('video-rate').value)
        }
      }).then(function (localStream) {
        mediaStream = localStream;
        localVideo.srcObject = localStream;
        localVideo.playsInline = true;
        localVideo.play().catch(console.error);
      })
    }
    else if (localVideoType == 'screen') {
      navigator.mediaDevices.getDisplayMedia(
      ).then(function (localStream) {
        mediaStream = localStream;
        localVideo.srcObject = localStream;
        localVideo.playsInline = true;
        localVideo.play().catch(console.error);
      });
    }
  })

  // Register caller handler
  callTrigger.addEventListener('click', () => {
    // Note that you need to ensure the peer has connected to signaling server
    // before using methods of peer instance.
    if (!peer.open) {
      return;
    }

    let mediaConnection = peer.call(remoteId.value, mediaStream, {
      videoCodec: String(localVideoCodec)
    });
    //videoCodec: String(document.getElementById('video-codec').value)

    console.log(localVideoCodec.value);

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
  });

  peer.once('open', id => (localId.textContent = id));

  // Register callee handler
  peer.on('call', mediaConnection => {
    mediaConnection.answer(mediaStream, {
      videoCodec: String(localVideoCodec)
    });
    //videoCodec: String(document.getElementById('video-codec').value)

    console.log(localVideoCodec.value);

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
})();