package com.cricket.scorer.util

import android.content.Context
import java.net.Inet4Address
import java.net.NetworkInterface
import java.util.Collections

object NetworkUtils {
    /**
     * Resolves the primary active non-loopback IPv4 address on the device (e.g. Wi-Fi).
     */
    fun getLocalIpAddress(context: Context? = null): String {
        try {
            val interfaces = Collections.list(NetworkInterface.getNetworkInterfaces())
            // First priority: common local Wi-Fi private subnets
            for (intf in interfaces) {
                if (intf.isLoopback || !intf.isUp) continue
                val addrs = Collections.list(intf.inetAddresses)
                for (addr in addrs) {
                    if (!addr.isLoopbackAddress && addr is Inet4Address) {
                        val host = addr.hostAddress ?: continue
                        if (host.startsWith("192.168.") || host.startsWith("10.") || host.startsWith("172.")) {
                            return host
                        }
                    }
                }
            }
            // Fallback: any non-loopback IPv4
            for (intf in interfaces) {
                if (intf.isLoopback || !intf.isUp) continue
                val addrs = Collections.list(intf.inetAddresses)
                for (addr in addrs) {
                    if (!addr.isLoopbackAddress && addr is Inet4Address) {
                        return addr.hostAddress ?: "127.0.0.1"
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return "127.0.0.1"
    }
}
