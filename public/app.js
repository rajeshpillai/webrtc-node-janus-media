let janus = null;
let videoroom = null;
let myRoom = 1234; // Change to your room ID
let myId = null;
let myPrivateId = null;
let myStream = null;

let dataChannel = null;

let SERVER_URL = "ws://localhost:8188";
// let PUBLIC_SERVER_URL = "wss://b48b-122-170-113-8.ngrok-free.app";

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
            server: SERVER_URL, // Change to your Janus server WebSocket address
            success: function() {
                // Attach to VideoRoom plugin
                janus.attach({
                    plugin: "janus.plugin.videoroom",
                    success: function(pluginHandle) {
                        videoroom = pluginHandle;
                        Janus.log("Plugin attached! (" + videoroom.getPlugin() + ", id=" + videoroom.getId() + ")");
                        // Prepare to join the room

                        // Generate a unique username
                        let userName =  Janus.randomString(12);

                        // Inside janus.attach success callback
                        let register = { "request": "join", "room": myRoom, "ptype": "publisher", "display": userName };
                        console.log(`User ${userName} joining room ${myRoom}`);
                        videoroom.send({"message": register});
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
                    onlocaltrack: function(track, on) {
                        Janus.debug(" ::: Got a local track event :::");
                        Janus.debug("Local track " + (on ? "added" : "removed") + ":", track);
                        if(!on) {
                            // Track removed, handle accordingly
                            return;
                        }
                        if(!myStream) {
                            myStream = new MediaStream();
                        }
                        myStream.addTrack(track);
                        if(track.kind === "video") {
                            Janus.attachMediaStream(document.getElementById('localVideo'), myStream);
                        }
                    },
                    onlocaltrackXX: function(track, on) {
                        Janus.log(" ::: Got a local track event :::");
                        Janus.debug("Local track " + (on ? "added" : "removed") + ":", track);
                        // We use the track ID as name of the element, but it may contain invalid characters
                        let trackId = track.id.replace(/[{}]/g, "");
                        const video = document.querySelector('#localvideo');
                        if(!on) {
                            // Track removed, get rid of the stream and the rendering
                            let stream = localTracks[trackId];
                            if(stream) {
                                try {
                                    let tracks = stream.getTracks();
                                    for(let i in tracks) {
                                        let mst = tracks[i];
                                        if(mst)
                                            mst.stop();
                                    }
                                } catch(e) {}
                            }
                            if(track.kind === "video") {
                                // video.remove();
                                localVideos--;
                                if(localVideos === 0) {
                                    // No video, at least for now: show a placeholder
                                    video.append(
                                        '<div class="no-video-container">' +
                                            '<i class="fa-solid fa-video fa-xl no-video-icon"></i>' +
                                            '<span class="no-video-text">No webcam available</span>' +
                                        '</div>');
                                    
                                }
                            }
                            delete localTracks[trackId];
                            return;
                        }
                        // If we're here, a new track was added
                        mystream = localTracks[trackId];
                        if(mystream) {
                            // We've been here already
                            return;
                        }
                        if(track.kind === "audio") {
                            // We ignore local audio tracks, they'd generate echo anyway
                        } else {
                            // New video track: create a stream out of it
                            localVideos++;
                            mystream = new MediaStream([track]);
                            localTracks[trackId] = mystream;
                            Janus.log("Created local stream:", mystream);
                            Janus.log(mystream.getTracks());
                            Janus.log(mystream.getVideoTracks());
                            Janus.attachMediaStream(video, mystream);
                        }
                        if(vroomHandle.webrtcStuff.pc.iceConnectionState !== "completed" &&
                        vroomHandle.webrtcStuff.pc.iceConnectionState !== "connected") {
                            Janus.log(`Publishing...`)
                        }
                    },
                    onremotetrack: function(track, mid, on) {
                        let participantId = "participant_" + mid; // Construct an ID for the participant
                        let existingVideo = document.getElementById(participantId);
                        alert(existingVideo);
                        if (!existingVideo && on) {
                            let remoteVideo = document.createElement('video');
                            remoteVideo.id = participantId;
                            remoteVideo.autoplay = true;
                            remoteVideo.playsinline = true;
                            document.getElementById('remoteVideos').appendChild(remoteVideo);
                            let remoteStream = new MediaStream();
                            remoteStream.addTrack(track);
                            remoteVideo.srcObject = remoteStream;
                        }
                    },
                    
                    ondataopen: function() {
                        console.log("The Data Channel is available");
                        // Enable the chat input and send button when the data channel is open
                        document.getElementById("chatInput").disabled = false;
                        document.getElementById("sendChat").disabled = false;
                    },
                    ondata: function(data) {
                        console.log("We got data from the Data Channel! " + data);
                        // Append received chat messages to the chat area
                        let chatArea = document.getElementById("chatArea");
                        let msg = document.createElement("p");
                        msg.innerText = data;
                        chatArea.appendChild(msg);
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

document.getElementById("sendChat").addEventListener("click", function() {
    let message = document.getElementById("chatInput").value;
    if(message === "") {
        alert("Please enter a message");
        return;
    }
    console.log("Sending message", message);
    videoroom.data({ text: message });
    document.getElementById("chatInput").value = ""; // Clear the input after sending
});

