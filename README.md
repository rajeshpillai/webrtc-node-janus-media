# Node WebRTC + Janus Media Server
A example of WebRTC with Janus Media Server.

# Run the Janus Media Server 
via docker (or it it up as per your requirements)

- docker pull canyan/janus-gateway:latest
- docker run --name=janus -p 8088:8088 -p 8188:8188  canyan/janus-gateway


# Start the node server
```javascript
npm start
```


# Features
- Video calling
- Chat in progress with Data Channel (TODO) 
- Remote Video (TODO)