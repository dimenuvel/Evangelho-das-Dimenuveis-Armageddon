package com.dimenuveis.armageddon;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import com.getcapacitor.BridgeActivity;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.Enumeration;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                this.bridge.getWebView().addJavascriptInterface(new DeviceNetworkInterface(), "AndroidDevice");
                this.bridge.getWebView().setWebChromeClient(new WebChromeClient() {
                    @Override
                    public void onPermissionRequest(final PermissionRequest request) {
                        request.grant(request.getResources());
                    }
                });
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        handleDeepLinkIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleDeepLinkIntent(intent);
    }

    private void handleDeepLinkIntent(Intent intent) {
        if (intent == null || intent.getData() == null) return;

        Uri data = intent.getData();
        String uriStr = data.toString();
        DeviceNetworkInterface.pendingJoinUri = uriStr;

        String code = data.getQueryParameter("join");
        if (code == null || code.isEmpty()) {
            code = data.getQueryParameter("code");
        }
        String host = data.getQueryParameter("host");
        if (host == null || host.isEmpty()) {
            String hostName = data.getHost();
            if (hostName != null && !hostName.equalsIgnoreCase("join") && !hostName.equalsIgnoreCase("localhost")) {
                host = hostName;
            }
        }

        final String finalCode = code != null ? code : "";
        final String finalHost = host != null ? host : "";

        if (this.bridge != null && this.bridge.getWebView() != null) {
            String js = "window.dispatchEvent(new CustomEvent('appDeepLink', { detail: { uri: '" + uriStr + "', code: '" + finalCode + "', host: '" + finalHost + "' } }));";
            this.bridge.getWebView().postDelayed(() -> {
                try {
                    if (MainActivity.this.bridge != null && MainActivity.this.bridge.getWebView() != null) {
                        MainActivity.this.bridge.getWebView().evaluateJavascript(js, null);
                    }
                } catch (Exception ignored) {}
            }, 600);
        }
    }

    public static class DeviceNetworkInterface {
        public static String pendingJoinUri = null;

        @JavascriptInterface
        public String getPendingJoinUri() {
            String uri = pendingJoinUri;
            pendingJoinUri = null;
            return uri != null ? uri : "";
        }

        @JavascriptInterface
        public String getDeviceLocalIp() {
            try {
                Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
                String candidate = "";
                while (interfaces.hasMoreElements()) {
                    NetworkInterface iface = interfaces.nextElement();
                    if (iface.isLoopback() || !iface.isUp()) continue;
                    Enumeration<InetAddress> addresses = iface.getInetAddresses();
                    while (addresses.hasMoreElements()) {
                        InetAddress addr = addresses.nextElement();
                        if (addr instanceof Inet4Address && !addr.isLoopbackAddress()) {
                            String host = addr.getHostAddress();
                            if (host != null && !host.startsWith("127.") && !host.startsWith("169.254.")) {
                                if (host.startsWith("192.168.")) {
                                    return host;
                                } else if (host.startsWith("10.") || host.startsWith("172.")) {
                                    candidate = host;
                                } else if (candidate.isEmpty()) {
                                    candidate = host;
                                }
                            }
                        }
                    }
                }
                return candidate;
            } catch (Exception e) {
                return "";
            }
        }

        @JavascriptInterface
        public boolean startLocalServer(int port) {
            String ip = getDeviceLocalIp();
            return EmbeddedGameServer.getInstance().start(port > 0 ? port : 3000, ip);
        }

        @JavascriptInterface
        public boolean stopLocalServer() {
            EmbeddedGameServer.getInstance().stop();
            return true;
        }

        @JavascriptInterface
        public boolean isServerRunning() {
            return EmbeddedGameServer.getInstance().isRunning();
        }

        @JavascriptInterface
        public int getServerPort() {
            return EmbeddedGameServer.getInstance().getPort();
        }
    }
}

