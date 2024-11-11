import React, { useEffect, useRef, useState } from 'react';
import { initializePeer, setupLocalStream, setupMediaConnectionHandlers, setupDataConnectionHandlers, adjustPTZ, estimateMediaLatency } from './webrtcFunctions';

const API_KEY: string = "94d5c621-415d-4003-a1be-822df987831f";
const Peer = (window as any).Peer;

const WebrtcApp: React.FC = () => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [peer, setPeer] = useState<any>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [mediaConnection, setMediaConnection] = useState<any>(null);
  const [dataConnection, setDataConnection] = useState<any>(null);
  const [targetDevice, setTargetDevice] = useState<string>("default");
  const [userName, setUserName] = useState<string>("");
  const [remoteId, setRemoteId] = useState<string>("");
  const [videoOptions, setVideoOptions] = useState({
    videoCodec: "VP8",
    videoBandwidth: 3000,
    videoHeight: 1080,
    videoWidth: 1920,
    videoRate: 30,
    videoContent: "motion",
  });
  const [ptzOptions, setPtzOptions] = useState({
    pan: 0,
    tilt: 0,
    zoom: 100,
  });
  const [message, setMessage] = useState<string>("");
  const messagesRef = useRef<HTMLPreElement>(null);

  const handleMakePeer = () => {
    const peerInstance = initializePeer(userName, API_KEY);
    setPeer(peerInstance);
    setupPeerHandlers(peerInstance);
  };

  const handleCapture = () => {
    const selectedStreamType = "camera"; // For simplicity, defaulting to camera here
    setupLocalStream(selectedStreamType, targetDevice, localVideoRef.current!).then(stream => {
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    }).catch(console.error);
  };

  const handleDeleteCapture = () => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    setLocalStream(null);
  };

  const handleCall = () => {
    if (peer && localStream) {
      const videoCallOptions = {
        videoBandwidth: videoOptions.videoBandwidth,
        videoCodec: videoOptions.videoCodec,
        audioCodec: "opus"
      };
      const mediaConn = peer.call(remoteId, localStream, videoCallOptions);
      setMediaConnection(mediaConn);
      setupMediaConnectionHandlers(mediaConn, remoteVideoRef.current!);

      const dataConn = peer.connect(remoteId);
      setDataConnection(dataConn);
      setupDataConnectionHandlers(dataConn, messagesRef.current!);
    }
  };

  useEffect(() => {
    const latencyInterval = setInterval(() => {
      if (localStream) {
        estimateMediaLatency(localStream, ptzOptions);
      }
    }, 100);

    const ptzInterval = setInterval(() => {
      if (localStream) {
        adjustPTZ(localStream, ptzOptions);
      }
    }, 33);

    return () => {
      clearInterval(latencyInterval);
      clearInterval(ptzInterval);
    };
  }, [localStream, ptzOptions]);

  return (
    <div>
      <h1>P2P WebRTC React App</h1>
      <div>
        <input
          type="text"
          placeholder="Your Name"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
        />
        <button onClick={handleMakePeer}>Make Peer</button>
      </div>
      <div>
        <video ref={localVideoRef} width="480" height="320" autoPlay playsInline></video>
        <button onClick={handleCapture}>Get Capture</button>
        <button onClick={handleDeleteCapture}>Delete Capture Source</button>
      </div>
      <div>
        <input
          type="text"
          placeholder="Remote Peer ID"
          value={remoteId}
          onChange={(e) => setRemoteId(e.target.value)}
        />
        <button onClick={handleCall}>Call</button>
      </div>
      <div>
        <video ref={remoteVideoRef} width="480" height="320" autoPlay playsInline></video>
      </div>
      <div>
        <pre ref={messagesRef}></pre>
        <input
          type="text"
          placeholder="Please input message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button onClick={() => {
          if (dataConnection) {
            dataConnection.send(message);
            if (messagesRef.current) {
              messagesRef.current.textContent += `You: ${message}\n`;
            }
            setMessage("");
          }
        }}>Send</button>
      </div>
    </div>
  );
};

export default WebrtcApp;