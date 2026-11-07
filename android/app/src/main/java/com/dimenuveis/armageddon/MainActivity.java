package com.dimenuveis.armageddon;

import android.os.Bundle;
import android.webkit.JavascriptInterface;
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
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static class DeviceNetworkInterface {
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

