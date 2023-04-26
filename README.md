# open-webrtc

***
#### Github pages
https://jellybeans511.github.io/open-webrtc/

#### Service
https://skyway.ntt.com/

## IMPORTANT!!!!
This site uses API keys to identify Peers. If a user with this site's API key exists and the name of the Peer you created is called or invoked, communication may occur with an unexpected person.

###### Make peer
Enter your name in the text box and click the Make Peer button. Your Peer ID will be created.

###### GetCapture
You can choose to use camera or display mirroring. Image source parameters are set by text box as video height, video width, frame rate.

###### Call
Enter the remote ID and press the Call button. If you have media stream, it will be transmitted for remote peer. And if remote has media stream, you will receive remote media stream. Call options are bitrate and video codec and content type. It will be applied on pressing call button. Generally VP9 is recommended in video codec. If your PC is old, it is better to use VP8. I don't recommend using H264 in WebRTC. AV1 is very CPU intensive and is only recommended if hardware encoding and decoding is supported. For example, use a set of Jetson orin for encoding and RTX30 series for decoding.

##### Pan Tilt Zoom
If you use PTZ camera, you can control parameters of pan tilt zoom  by numner box. I only confirmed Insta360 Link.

#### ※ISSUE
If your video codec and remote video codec are different, you will miss exchanging media stream. It is unknown reason. Please set same codecs if you using this application.

### The author is not responsible for any disadvantages caused by using this web page.
