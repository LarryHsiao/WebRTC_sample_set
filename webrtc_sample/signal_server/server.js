//require our websocket library
var WebSocketServer = require('ws').Server;

//creating a websocket server at port 9090
var socket = new WebSocketServer({port: 9090});

//all connected to the server users
var users = {};

//when a user connects to our sever
socket.on('connection', function (fromConn) {

    console.log("User connected");

    //when server gets a message from a connected user
    fromConn.on('message', function (message) {
        var data;
        try {
            data = JSON.parse(message);
        } catch (e) {
            console.log("Invalid JSON");
            data = {};
        }
        switch (data.type) {
            case "login":
                console.log("User logged", data.name);
                if (users[data.name]) {
                    sendTo(fromConn, {
                        type: "login",
                        success: false,
                        name: data.name
                    });
                } else {
                    users[data.name] = fromConn;
                    fromConn.name = data.name;
                    sendTo(fromConn, {
                        type: "login",
                        success: true,
                        name: data.name
                    });
                }
                break;
            case "offer":
                console.log("Sending offer to: ", data.name);
                var targetConn = users[data.name];
                if (targetConn != null) {
                    fromConn.otherName = data.name;
                    sendTo(targetConn, {
                        type: "offer",
                        sessionDescription: data.sessionDescription,
                        offerName: fromConn.name
                    });
                }
                break;
            case "answer":
                console.log("Sending answer to: ", data.offerName);
                //for ex. UserB answers UserA
                var offerConn = users[data.offerName];

                if (offerConn != null) {
                    fromConn.otherName = data.offerName;
                    sendTo(offerConn, {
                        type: "answer",
                        sessionDescription: data.sessionDescription
                    });
                }
                break;
            case "candidate":
                console.log("Sending candidate to:", data.name);
                var targetConn = users[data.name];

                if (targetConn != null) {
                    sendTo(targetConn, {
                        type: "candidate",
                        candidate: data.candidate
                    });
                }
                break;
            case "leave":
                console.log("Disconnecting from", data.name);
                var conn = users[data.name];

                //notify the other user so he can disconnect his peer connection
                if (conn != null) {
                    sendTo(conn, {
                        type: "leave"
                    });
                }
                break;
            default:
                sendTo(fromConn, {
                    type: "error",
                    message: "Command not found: " + data.type
                });
                break;
        }
    });

    //when user exits, for example closes a browser window
    //this may help if we are still in "offer","answer" or "candidate" state
    fromConn.on("close", function () {
        console.log("User disconnected")
        if (fromConn.name) {
            delete users[fromConn.name];

            if (fromConn.otherName) {
                console.log("Disconnecting from ", fromConn.otherName);
                var conn = users[fromConn.otherName];
                conn.otherName = null;

                if (conn != null) {
                    sendTo(conn, {
                        type: "leaved"
                    });
                }
            }
        }
    });

    fromConn.send({
        "type": "connected"
    }.string);
});

function sendTo(connection, message) {
    connection.send(JSON.stringify(message));
}