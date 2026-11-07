package com.dimenuveis.armageddon;

import android.util.Base64;
import android.util.Log;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Native Embedded WebSocket & HTTP Server for Android.
 * Runs directly on the Android device, allowing the phone to act as the
 * authoritative LAN game server on port 3000 without requiring any external PC or cloud server.
 */
public class EmbeddedGameServer {
    private static final String TAG = "EmbeddedGameServer";
    private static final String WS_MAGIC_KEY = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
    private static final char[] CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();

    private static EmbeddedGameServer instance;

    private ServerSocket serverSocket;
    private ExecutorService executorService;
    private boolean isRunning = false;
    private int port = 3000;
    private String localIpAddress = "";

    // Active Game Rooms: code -> GameRoom
    private final Map<String, GameRoom> rooms = new ConcurrentHashMap<>();
    // Connection tracking: socket -> WsConnection
    private final List<WsConnection> activeConnections = new ArrayList<>();

    public static synchronized EmbeddedGameServer getInstance() {
        if (instance == null) {
            instance = new EmbeddedGameServer();
        }
        return instance;
    }

    private EmbeddedGameServer() {}

    public synchronized boolean start(int targetPort, String currentIp) {
        if (isRunning && serverSocket != null && !serverSocket.isClosed()) {
            if (this.port == targetPort) {
                this.localIpAddress = currentIp;
                Log.d(TAG, "Server already running on port " + targetPort);
                return true;
            }
            stop();
        }

        this.port = targetPort > 0 ? targetPort : 3000;
        this.localIpAddress = currentIp != null ? currentIp : "";

        try {
            serverSocket = new ServerSocket();
            serverSocket.setReuseAddress(true);
            serverSocket.bind(new InetSocketAddress(this.port));
            isRunning = true;

            executorService = Executors.newCachedThreadPool();
            executorService.submit(this::listenLoop);

            Log.i(TAG, "Embedded Android Game Server started successfully on port " + this.port);
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Failed to start Embedded Game Server on port " + this.port, e);
            isRunning = false;
            return false;
        }
    }

    public synchronized void stop() {
        isRunning = false;
        try {
            if (serverSocket != null && !serverSocket.isClosed()) {
                serverSocket.close();
            }
        } catch (Exception ignored) {}

        synchronized (activeConnections) {
            for (WsConnection conn : activeConnections) {
                conn.close();
            }
            activeConnections.clear();
        }
        rooms.clear();

        if (executorService != null && !executorService.isShutdown()) {
            executorService.shutdownNow();
        }

        Log.i(TAG, "Embedded Android Game Server stopped.");
    }

    public boolean isRunning() {
        return isRunning && serverSocket != null && !serverSocket.isClosed();
    }

    public int getPort() {
        return port;
    }

    private void listenLoop() {
        while (isRunning && serverSocket != null && !serverSocket.isClosed()) {
            try {
                Socket client = serverSocket.accept();
                client.setTcpNoDelay(true);
                executorService.submit(() -> handleClientSocket(client));
            } catch (Exception e) {
                if (!isRunning) break;
            }
        }
    }

    private void handleClientSocket(Socket socket) {
        try {
            InputStream in = socket.getInputStream();
            OutputStream out = socket.getOutputStream();

            // Read HTTP request header block (up to double CRLF)
            ByteArrayOutputStream headerBuf = new ByteArrayOutputStream();
            int b;
            int matched = 0;
            while ((b = in.read()) != -1) {
                headerBuf.write(b);
                if ((matched == 0 || matched == 2) && b == '\r') matched++;
                else if ((matched == 1 || matched == 3) && b == '\n') matched++;
                else matched = 0;
                if (matched == 4) break;
            }

            String headerText = new String(headerBuf.toByteArray(), StandardCharsets.UTF_8);
            String[] lines = headerText.split("\r\n");
            if (lines.length == 0 || lines[0].isEmpty()) {
                socket.close();
                return;
            }

            String requestLine = lines[0];
            String secWsKey = null;
            boolean isWebSocketUpgrade = false;

            for (String line : lines) {
                String lower = line.toLowerCase();
                if (lower.startsWith("upgrade:") && lower.contains("websocket")) {
                    isWebSocketUpgrade = true;
                } else if (lower.startsWith("sec-websocket-key:")) {
                    int colon = line.indexOf(':');
                    if (colon != -1) {
                        secWsKey = line.substring(colon + 1).trim();
                    }
                }
            }

            // 1. HTTP REST Endpoints
            if (!isWebSocketUpgrade) {
                handleHttpEndpoint(requestLine, out);
                socket.close();
                return;
            }

            // 2. WebSocket Upgrade Handshake (RFC 6455)
            if (secWsKey == null) {
                socket.close();
                return;
            }

            String acceptKey = computeWebSocketAccept(secWsKey);
            String response = "HTTP/1.1 101 Switching Protocols\r\n" +
                    "Upgrade: websocket\r\n" +
                    "Connection: Upgrade\r\n" +
                    "Sec-WebSocket-Accept: " + acceptKey + "\r\n\r\n";
            out.write(response.getBytes(StandardCharsets.UTF_8));
            out.flush();

            // 3. Maintain active WebSocket session
            WsConnection conn = new WsConnection(socket, in, out);
            synchronized (activeConnections) {
                activeConnections.add(conn);
            }
            conn.readLoop();

        } catch (Exception e) {
            try {
                socket.close();
            } catch (Exception ignored) {}
        }
    }

    private void handleHttpEndpoint(String requestLine, OutputStream out) {
        try {
            if (requestLine.contains("/api/network-info")) {
                JSONObject json = new JSONObject();
                json.put("localIp", localIpAddress);
                json.put("port", port);
                json.put("localUrl", "http://" + localIpAddress + ":" + port);
                json.put("activeRooms", rooms.size());
                sendJsonResponse(out, 200, json.toString());
            } else if (requestLine.contains("/api/rooms")) {
                JSONArray list = new JSONArray();
                for (GameRoom room : rooms.values()) {
                    if ("LOBBY".equals(room.status) && room.guestConn == null) {
                        JSONObject r = new JSONObject();
                        r.put("code", room.code);
                        r.put("hostName", room.hostName);
                        r.put("hostFaction", room.hostFaction);
                        r.put("settings", room.settings);
                        list.put(r);
                    }
                }
                JSONObject resp = new JSONObject();
                resp.put("rooms", list);
                sendJsonResponse(out, 200, resp.toString());
            } else {
                // Default health check response
                JSONObject status = new JSONObject();
                status.put("status", "ok");
                status.put("server", "Evangelho das Dimenuveis Android Server");
                status.put("version", "1.0");
                sendJsonResponse(out, 200, status.toString());
            }
        } catch (Exception e) {
            Log.e(TAG, "Error responding to HTTP endpoint", e);
        }
    }

    private void sendJsonResponse(OutputStream out, int statusCode, String body) throws Exception {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        String header = "HTTP/1.1 " + statusCode + " OK\r\n" +
                "Content-Type: application/json; charset=utf-8\r\n" +
                "Access-Control-Allow-Origin: *\r\n" +
                "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n" +
                "Access-Control-Allow-Headers: Content-Type\r\n" +
                "Content-Length: " + bytes.length + "\r\n" +
                "Connection: close\r\n\r\n";
        out.write(header.getBytes(StandardCharsets.UTF_8));
        out.write(bytes);
        out.flush();
    }

    private String computeWebSocketAccept(String key) throws Exception {
        String input = key + WS_MAGIC_KEY;
        MessageDigest md = MessageDigest.getInstance("SHA-1");
        byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
        return Base64.encodeToString(hash, Base64.NO_WRAP);
    }

    private String generateUniqueRoomCode() {
        Random random = new Random();
        for (int attempt = 0; attempt < 100; attempt++) {
            StringBuilder sb = new StringBuilder(4);
            for (int i = 0; i < 4; i++) {
                sb.append(CODE_CHARS[random.nextInt(CODE_CHARS.length)]);
            }
            String code = sb.toString();
            if (!rooms.containsKey(code)) {
                return code;
            }
        }
        return "R" + (100 + random.nextInt(900));
    }

    // WebSocket Message Router
    private void handleWsMessage(WsConnection conn, String rawMessage) {
        try {
            JSONObject msg = new JSONObject(rawMessage);
            String type = msg.optString("type", "");
            JSONObject payload = msg.optJSONObject("payload");
            if (payload == null) {
                payload = new JSONObject();
            }

            switch (type) {
                case "CREATE_ROOM": {
                    String code = generateUniqueRoomCode();
                    String hostName = payload.optString("name", "Host Seeker");
                    String hostFaction = payload.optString("faction", "COSMIC_BOWLERS");

                    JSONObject settings = new JSONObject();
                    settings.put("mapId", payload.optString("mapId", "COSMIC_BOWLING_ALLEY"));
                    settings.put("turnTimeLimit", payload.optInt("turnTimeLimit", 45));
                    settings.put("teamSize", payload.optInt("teamSize", 3));

                    GameRoom room = new GameRoom();
                    room.code = code;
                    room.hostConn = conn;
                    room.hostName = hostName;
                    room.hostFaction = hostFaction;
                    room.settings = settings;
                    room.status = "LOBBY";

                    rooms.put(code, room);
                    conn.roomCode = code;
                    conn.role = "HOST";

                    JSONObject roomInfo = new JSONObject();
                    roomInfo.put("hostName", hostName);
                    roomInfo.put("hostFaction", hostFaction);
                    roomInfo.put("settings", settings);

                    JSONObject createdPayload = new JSONObject();
                    createdPayload.put("code", code);
                    createdPayload.put("role", "HOST");
                    createdPayload.put("roomInfo", roomInfo);

                    JSONObject reply = new JSONObject();
                    reply.put("type", "ROOM_CREATED");
                    reply.put("payload", createdPayload);
                    conn.send(reply.toString());
                    break;
                }

                case "JOIN_ROOM": {
                    String reqCode = payload.optString("code", "").trim().toUpperCase();
                    GameRoom room = rooms.get(reqCode);

                    if (room == null) {
                        JSONObject err = new JSONObject();
                        err.put("type", "ERROR");
                        JSONObject p = new JSONObject();
                        p.put("message", "ROOM_NOT_FOUND");
                        p.put("code", reqCode);
                        err.put("payload", p);
                        conn.send(err.toString());
                        return;
                    }

                    if (room.guestConn != null && room.guestConn.isOpen()) {
                        JSONObject err = new JSONObject();
                        err.put("type", "ERROR");
                        JSONObject p = new JSONObject();
                        p.put("message", "ROOM_FULL");
                        p.put("code", reqCode);
                        err.put("payload", p);
                        conn.send(err.toString());
                        return;
                    }

                    String guestName = payload.optString("name", "Challenger");
                    String guestFaction = payload.optString("faction", "NIHILISTS");

                    room.guestConn = conn;
                    room.guestName = guestName;
                    room.guestFaction = guestFaction;
                    conn.roomCode = reqCode;
                    conn.role = "GUEST";

                    // Notify Guest
                    JSONObject guestPayload = new JSONObject();
                    guestPayload.put("code", reqCode);
                    guestPayload.put("role", "GUEST");

                    JSONObject hostObj = new JSONObject();
                    hostObj.put("name", room.hostName);
                    hostObj.put("faction", room.hostFaction);
                    guestPayload.put("host", hostObj);

                    JSONObject guestObj = new JSONObject();
                    guestObj.put("name", guestName);
                    guestObj.put("faction", guestFaction);
                    guestPayload.put("guest", guestObj);

                    JSONObject joinedReply = new JSONObject();
                    joinedReply.put("type", "ROOM_JOINED");
                    joinedReply.put("payload", guestPayload);
                    conn.send(joinedReply.toString());

                    // Notify Host
                    if (room.hostConn != null && room.hostConn.isOpen()) {
                        JSONObject guestConnectedPayload = new JSONObject();
                        guestConnectedPayload.put("guest", guestObj);
                        JSONObject guestConnectedMsg = new JSONObject();
                        guestConnectedMsg.put("type", "GUEST_CONNECTED");
                        guestConnectedMsg.put("payload", guestConnectedPayload);
                        room.hostConn.send(guestConnectedMsg.toString());
                    }
                    break;
                }

                case "UPDATE_SETTINGS": {
                    if (conn.roomCode != null) {
                        GameRoom room = rooms.get(conn.roomCode);
                        if (room != null && conn == room.hostConn) {
                            room.settings = payload;
                            if (room.guestConn != null && room.guestConn.isOpen()) {
                                JSONObject msgOut = new JSONObject();
                                msgOut.put("type", "SETTINGS_UPDATED");
                                msgOut.put("payload", payload);
                                room.guestConn.send(msgOut.toString());
                            }
                        }
                    }
                    break;
                }

                case "START_MATCH": {
                    if (conn.roomCode != null) {
                        GameRoom room = rooms.get(conn.roomCode);
                        if (room != null && conn == room.hostConn) {
                            room.status = "PLAYING";
                            long seed = System.currentTimeMillis();

                            JSONObject hostObj = new JSONObject();
                            hostObj.put("name", room.hostName != null ? room.hostName : "Host Seeker");
                            hostObj.put("faction", room.hostFaction != null ? room.hostFaction : "COSMIC_BOWLERS");

                            JSONObject guestObj = new JSONObject();
                            guestObj.put("name", room.guestName != null ? room.guestName : "Challenger");
                            guestObj.put("faction", room.guestFaction != null ? room.guestFaction : "NIHILISTS");

                            JSONObject basePayload = new JSONObject();
                            basePayload.put("code", room.code);
                            basePayload.put("seed", seed);
                            basePayload.put("host", hostObj);
                            basePayload.put("guest", guestObj);
                            basePayload.put("settings", room.settings != null ? room.settings : new JSONObject());

                            // Send to Host
                            JSONObject hostPayload = new JSONObject(basePayload.toString());
                            hostPayload.put("myRole", "HOST");
                            JSONObject hostMsg = new JSONObject();
                            hostMsg.put("type", "MATCH_STARTED");
                            hostMsg.put("payload", hostPayload);
                            conn.send(hostMsg.toString());

                            // Send to Guest
                            if (room.guestConn != null && room.guestConn.isOpen()) {
                                JSONObject guestPayload = new JSONObject(basePayload.toString());
                                guestPayload.put("myRole", "GUEST");
                                JSONObject guestMsg = new JSONObject();
                                guestMsg.put("type", "MATCH_STARTED");
                                guestMsg.put("payload", guestPayload);
                                room.guestConn.send(guestMsg.toString());
                            }
                        }
                    }
                    break;
                }

                case "GAME_ACTION": {
                    if (conn.roomCode != null) {
                        GameRoom room = rooms.get(conn.roomCode);
                        if (room != null) {
                            WsConnection target = (conn == room.hostConn) ? room.guestConn : room.hostConn;
                            if (target != null && target.isOpen()) {
                                JSONObject actionMsg = new JSONObject();
                                actionMsg.put("type", "GAME_ACTION");
                                actionMsg.put("payload", payload);
                                target.send(actionMsg.toString());
                            }
                        }
                    }
                    break;
                }

                case "SYNC_STATE": {
                    if (conn.roomCode != null) {
                        GameRoom room = rooms.get(conn.roomCode);
                        if (room != null) {
                            WsConnection target = (conn == room.hostConn) ? room.guestConn : room.hostConn;
                            if (target != null && target.isOpen()) {
                                JSONObject syncMsg = new JSONObject();
                                syncMsg.put("type", "SYNC_STATE");
                                syncMsg.put("payload", payload);
                                target.send(syncMsg.toString());
                            }
                        }
                    }
                    break;
                }

                case "PING": {
                    JSONObject pong = new JSONObject();
                    pong.put("type", "PONG");
                    pong.put("payload", new JSONObject());
                    conn.send(pong.toString());
                    break;
                }
            }

        } catch (Exception e) {
            Log.e(TAG, "Error parsing WebSocket message", e);
        }
    }

    private void handleWsClosed(WsConnection conn) {
        synchronized (activeConnections) {
            activeConnections.remove(conn);
        }

        if (conn.roomCode != null) {
            GameRoom room = rooms.get(conn.roomCode);
            if (room != null) {
                if (conn == room.hostConn) {
                    // Host left: close room and notify guest
                    if (room.guestConn != null && room.guestConn.isOpen()) {
                        try {
                            JSONObject err = new JSONObject();
                            err.put("type", "OPPONENT_DISCONNECTED");
                            JSONObject p = new JSONObject();
                            p.put("reason", "HOST_DISCONNECTED");
                            err.put("payload", p);
                            room.guestConn.send(err.toString());
                        } catch (Exception ignored) {}
                    }
                    rooms.remove(conn.roomCode);
                } else if (conn == room.guestConn) {
                    // Guest left: notify host and reopen slot
                    room.guestConn = null;
                    if (room.hostConn != null && room.hostConn.isOpen()) {
                        try {
                            JSONObject err = new JSONObject();
                            err.put("type", "OPPONENT_DISCONNECTED");
                            JSONObject p = new JSONObject();
                            p.put("reason", "GUEST_DISCONNECTED");
                            err.put("payload", p);
                            room.hostConn.send(err.toString());
                        } catch (Exception ignored) {}
                    }
                }
            }
        }
    }

    // Models
    private static class GameRoom {
        String code;
        WsConnection hostConn;
        String hostName;
        String hostFaction;
        JSONObject settings;
        WsConnection guestConn;
        String guestName;
        String guestFaction;
        String status;
    }

    private class WsConnection {
        private final Socket socket;
        private final InputStream in;
        private final OutputStream out;
        private boolean closed = false;

        String roomCode;
        String role;

        WsConnection(Socket socket, InputStream in, OutputStream out) {
            this.socket = socket;
            this.in = in;
            this.out = out;
        }

        boolean isOpen() {
            return !closed && socket.isConnected() && !socket.isClosed();
        }

        synchronized void send(String text) {
            if (!isOpen()) return;
            try {
                byte[] payload = text.getBytes(StandardCharsets.UTF_8);
                ByteArrayOutputStream buf = new ByteArrayOutputStream();
                buf.write(0x81); // FIN (0x80) | TEXT (0x01)

                if (payload.length <= 125) {
                    buf.write(payload.length);
                } else if (payload.length <= 65535) {
                    buf.write(126);
                    buf.write((payload.length >> 8) & 0xFF);
                    buf.write(payload.length & 0xFF);
                } else {
                    buf.write(127);
                    for (int i = 7; i >= 0; i--) {
                        buf.write((int) ((payload.length >> (8 * i)) & 0xFF));
                    }
                }

                buf.write(payload);
                out.write(buf.toByteArray());
                out.flush();
            } catch (Exception e) {
                close();
            }
        }

        void close() {
            closed = true;
            try {
                socket.close();
            } catch (Exception ignored) {}
        }

        void readLoop() {
            try {
                while (isOpen()) {
                    int b0 = in.read();
                    if (b0 == -1) break;

                    int opcode = b0 & 0x0F;
                    int b1 = in.read();
                    if (b1 == -1) break;

                    boolean masked = (b1 & 0x80) != 0;
                    int payloadLen = b1 & 0x7F;

                    if (payloadLen == 126) {
                        int hi = in.read();
                        int lo = in.read();
                        if (hi == -1 || lo == -1) break;
                        payloadLen = ((hi & 0xFF) << 8) | (lo & 0xFF);
                    } else if (payloadLen == 127) {
                        long len = 0;
                        for (int i = 0; i < 8; i++) {
                            int b = in.read();
                            if (b == -1) break;
                            len = (len << 8) | (b & 0xFF);
                        }
                        payloadLen = (int) len;
                    }

                    byte[] mask = new byte[4];
                    if (masked) {
                        int r = 0;
                        while (r < 4) {
                            int count = in.read(mask, r, 4 - r);
                            if (count == -1) break;
                            r += count;
                        }
                        if (r < 4) break;
                    }

                    byte[] data = new byte[payloadLen];
                    int offset = 0;
                    while (offset < payloadLen) {
                        int count = in.read(data, offset, payloadLen - offset);
                        if (count == -1) break;
                        offset += count;
                    }
                    if (offset < payloadLen) break;

                    if (masked) {
                        for (int i = 0; i < payloadLen; i++) {
                            data[i] = (byte) (data[i] ^ mask[i % 4]);
                        }
                    }

                    if (opcode == 8) { // CLOSE
                        try {
                            out.write(new byte[]{(byte) 0x88, 0x00});
                            out.flush();
                        } catch (Exception ignored) {}
                        break;
                    } else if (opcode == 9) { // PING
                        try {
                            out.write(new byte[]{(byte) 0x8A, 0x00});
                            out.flush();
                        } catch (Exception ignored) {}
                    } else if (opcode == 1) { // TEXT
                        String text = new String(data, StandardCharsets.UTF_8);
                        handleWsMessage(this, text);
                    }
                }
            } catch (Exception ignored) {
            } finally {
                close();
                handleWsClosed(this);
            }
        }
    }
}
