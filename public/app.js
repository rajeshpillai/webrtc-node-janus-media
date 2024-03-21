let janus = null;
let videoroom = null;
let myRoom = 1234; // Change to your room ID
let myId = null;
let myPrivateId = null;
let myStream = null;

// Initialize Janus
Janus.init({
    debug: "all", 
    callback: function() {
        if(!Janus.isWebrtcSupported()) {
            alert("No WebRTC support...");
            return;
        }
        // Create session
        janus = new Janus({
            server: "ws://localhost:8188", // Change to your Janus server WebSocket address
            success: function() {
                // Attach to VideoRoom plugin
                janus.attach({
                    plugin: "janus.plugin.videoroom",
                    success: function(pluginHandle) {
                        videoroom = pluginHandle;
                        Janus.log("Plugin attached! (" + videoroom.getPlugin() + ", id=" + videoroom.getId() + ")");
                        // Prepare to join the room
                        let register = { "request": "join", "room": myRoom, "ptype": "publisher", "display": "MyDisplayName" };
                        videoroom.send({ "message": register });
                    },
                    error: function(error) {
                        console.error("Error attaching plugin", error);
                    },
                    consentDialog: function(on) {
                        // e.g., show a consent dialog
                    },
                    webrtcState: function(on) {
                        Janus.log("WebRTC PeerConnection is " + (on ? "up" : "down") + " now");
                    },
                    onmessage: function(msg, jsep) {
                        // Handle messages (e.g., someone joined the room, video offers/answers)
                        Janus.debug(" ::: Got a message :::", msg);
                        let event = msg["videoroom"];
                        if(event) {
                            if(event === "joined") {
                                myId = msg["id"];
                                myPrivateId = msg["private_id"];
                                Janus.log("Successfully joined room " + msg["room"] + " with ID " + myId);
                                // Publish our stream
                                videoroom.createOffer({
                                    // Media constraints
                                    media: { video: true, audio: true },
                                    success: function(jsep) {
                                        Janus.debug("Got SDP!", jsep);
                                        let publish = { "request": "configure", "audio": true, "video": true };
                                        videoroom.send({ "message": publish, "jsep": jsep });
                                    },
                                    error: function(error) {
                                        Janus.error("WebRTC error:", error);
                                    }
                                });
                            } else if(event === "event") {
                                // Handle new publishers, hangups, etc.
                            }
                        }
                        if(jsep) {
                            // Handle remote answer
                            videoroom.handleRemoteJsep({ "jsep": jsep });
                        }
                    },
                    onlocalstream: function(stream) {
                        // Display our stream
                        Janus.attachMediaStream(document.getElementById('localVideo'), stream);
                        myStream = stream;
                    },
                    onremotestream: function(stream) {
                        // Display remote stream
                        let remoteVideo = document.createElement('video');
                        remoteVideo.autoplay = true;
                        remoteVideo.playsinline = true;
                        remoteVideo.controls = true; // Add controls attribute if you want
                        document.getElementById('remoteVideos').appendChild(remoteVideo);
                        Janus.attachMediaStream(remoteVideo, stream);
                    },
                    oncleanup: function() {
                        Janus.log("Cleaning up local stream...");
                    }
                });
            },
            error: function(error) {
                Janus.error(error);
                alert(error, function() {
                    window.location.reload();
                });
            },
            destroyed: function() {
                window.location.reload();
            }
        });
    }
});
